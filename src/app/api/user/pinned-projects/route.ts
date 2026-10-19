import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Project } from "@/lib/models/Project";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { isUserAuthorizedProjectMember } from "@/lib/projectMembership";

export const dynamic = "force-dynamic";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

// GET /api/user/pinned-projects — fetch pinned projects or eligible projects for the logged in user
export async function GET(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(req.url);
    const eligibleOnly = searchParams.get("eligible") === "true";

    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pinnedIds = (user.pinnedProjects || []).map(String);
    const isSystemAdmin = payload.role === "SYSTEM_ADMIN";

    if (eligibleOnly) {
      // Return projects user can access that are not yet pinned
      const query: any = { _id: { $nin: pinnedIds } };
      if (!isSystemAdmin) {
        query.$or = [
          { techOwner: user._id },
          { productOwner: user._id },
          { productOwners: user._id },
          { qaLead: user._id },
          { techTeamMembers: user._id },
        ];
      }

      const eligibleProjects = await Project.find(query)
        .populate("techOwner", "name email role")
        .sort({ updatedAt: -1 });

      const formatted = eligibleProjects.map((p: any) => ({
        _id: p._id,
        title: p.title || p.clientDetails?.companyName || "Untitled Project",
        status: p.status || "In Progress",
        clientName: p.clientDetails?.companyName || "",
        projectManager: p.techOwner?.name || "Unassigned",
      }));

      return NextResponse.json({ data: formatted }, { status: 200 });
    }

    // Default: return user's pinned projects
    const populatedUser = await User.findById(payload.userId).populate({
      path: "pinnedProjects",
      populate: [
        { path: "techOwner", select: "name email role" },
        { path: "productOwner", select: "name email role" },
        { path: "productOwners", select: "name email role" },
      ],
    });

    const validPinned: any[] = [];
    const staleIds: string[] = [];

    for (const project of (populatedUser?.pinnedProjects || []) as any[]) {
      if (!project) continue;
      if (!isSystemAdmin && !isUserAuthorizedProjectMember(project, payload.userId)) {
        staleIds.push(String(project._id));
        continue;
      }
      validPinned.push({
        _id: project._id,
        title: project.title || project.clientDetails?.companyName || "Untitled Project",
        description: project.description || "",
        status: project.status || "In Progress",
        clientDetails: project.clientDetails || {},
        techOwner: project.techOwner || null,
        timeline: project.timeline || {},
        estimatedDeliveryDate: project.estimatedDeliveryDate || null,
      });
    }

    if (staleIds.length > 0) {
      await User.findByIdAndUpdate(payload.userId, {
        $pull: { pinnedProjects: { $in: staleIds } },
      });
    }

    return NextResponse.json({ data: validPinned }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/user/pinned-projects — pin a project to user's quick access
export async function POST(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // RBAC: Non-system admins must be an authorized member of the project
    const isSystemAdmin = payload.role === "SYSTEM_ADMIN";
    if (!isSystemAdmin && !isUserAuthorizedProjectMember(project, payload.userId)) {
      return NextResponse.json(
        { error: "Forbidden: You are not authorized to pin this project." },
        { status: 403 }
      );
    }

    await User.findByIdAndUpdate(
      payload.userId,
      { $addToSet: { pinnedProjects: projectId } },
      { new: true }
    );

    return NextResponse.json(
      { message: "Project pinned to dashboard shortcuts successfully", projectId },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/user/pinned-projects — remove project from user's quick access
export async function DELETE(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    await dbConnect();

    await User.findByIdAndUpdate(
      payload.userId,
      { $pull: { pinnedProjects: projectId } },
      { new: true }
    );

    return NextResponse.json(
      { message: "Project removed from shortcuts", projectId },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
