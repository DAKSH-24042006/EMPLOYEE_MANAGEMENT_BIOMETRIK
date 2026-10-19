import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { User } from "@/lib/models/User";
import { Project } from "@/lib/models/Project";
import { PersonalProject } from "@/lib/models/PersonalProject";
import { Role } from "@/lib/constants";
import { isUserAuthorizedProjectMember } from "@/lib/projectMembership";

export const dynamic = "force-dynamic";

// GET /api/personal-projects — list personal projects for authenticated user
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    // Verify current user from trusted DB record
    const user = await User.findById(authResult.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isSystemAdmin = user.role === Role.SYSTEM_ADMIN;

    const pinnedRecords = await PersonalProject.find({ user: user._id })
      .populate({
        path: "project",
        populate: [{ path: "techOwner", select: "name email role" }],
      })
      .sort({ createdAt: -1 });

    const validPersonalProjects: any[] = [];
    const staleRecordIds: any[] = [];

    for (const record of pinnedRecords) {
      const project: any = record.project;

      // Stale pin: project was deleted from the database
      if (!project) {
        staleRecordIds.push(record._id);
        continue;
      }

      // Membership enforcement for non-System Admins
      if (!isSystemAdmin) {
        const hasValidMembership = isUserAuthorizedProjectMember(project, String(user._id));
        if (!hasValidMembership) {
          // Stale pin: membership was revoked. Exclude from response and clean up.
          staleRecordIds.push(record._id);
          continue;
        }
      }

      validPersonalProjects.push({
        _id: project._id,
        title: project.title || project.clientDetails?.companyName || "Untitled Project",
        description: project.description || "",
        status: project.status || "Active",
        clientDetails: {
          companyName: project.clientDetails?.companyName || "",
          contactPerson: project.clientDetails?.contactPerson || "",
          email: project.clientDetails?.email || "",
        },
        techOwner: project.techOwner
          ? {
              _id: project.techOwner._id,
              name: project.techOwner.name,
              email: project.techOwner.email,
            }
          : null,
        timeline: {
          startDate: project.timeline?.startDate || null,
          endDate: project.timeline?.endDate || null,
        },
        estimatedDeliveryDate: project.estimatedDeliveryDate || null,
        pinnedAt: record.createdAt,
      });
    }

    // Batch cleanup of stale pins, scoped strictly to the current user
    if (staleRecordIds.length > 0) {
      await PersonalProject.deleteMany({ _id: { $in: staleRecordIds }, user: user._id });
    }

    return NextResponse.json({ data: validPersonalProjects }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/personal-projects — add project to authenticated user's personal projects
export async function POST(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await req.json().catch(() => ({}));
    const { projectId } = body;

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Valid Project ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Verify current user from trusted DB record
    const user = await User.findById(authResult.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check project existence
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Server-side authorization check: System Admin exception vs Membership
    const isSystemAdmin = user.role === Role.SYSTEM_ADMIN;

    if (!isSystemAdmin) {
      const isMember = isUserAuthorizedProjectMember(project, String(user._id));
      if (!isMember) {
        return NextResponse.json(
          {
            error:
              "Forbidden: You can only pin projects where you are assigned as Project Manager, Developer, QA, or Product Owner.",
          },
          { status: 403 }
        );
      }
    }

    // Prevent duplicate pin
    const existing = await PersonalProject.findOne({
      user: user._id,
      project: project._id,
    });

    if (existing) {
      return NextResponse.json(
        { error: "Project is already in your personal projects" },
        { status: 409 }
      );
    }

    // Create the personal project pin (does NOT modify project assignments/memberships)
    const newPersonalProject = await PersonalProject.create({
      user: user._id,
      project: project._id,
    });

    return NextResponse.json(
      {
        message: "Project successfully added to Personal Projects",
        data: {
          _id: newPersonalProject._id,
          projectId: project._id,
          pinnedAt: newPersonalProject.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Project is already in your personal projects" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/personal-projects — remove project from authenticated user's personal projects
export async function DELETE(req: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(req.url);
    let projectId = searchParams.get("projectId");

    if (!projectId) {
      const body = await req.json().catch(() => ({}));
      projectId = body?.projectId;
    }

    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: "Valid Project ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Remove the pin strictly scoped to the authenticated user
    const deleted = await PersonalProject.findOneAndDelete({
      user: authResult.userId,
      project: projectId,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Project is not in your personal projects" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Project removed from personal projects", projectId },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
