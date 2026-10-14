import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { ProjectBlocker } from "@/lib/models/ProjectBlocker";
import { Notification } from "@/lib/models/Notification";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; blockerId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { id, blockerId } = await params;
    const body = await req.json();
    const { title, description, type, priority, ownerId, dueDate, status, resolutionNote } = body;

    await dbConnect();

    const blocker = await ProjectBlocker.findById(blockerId);
    if (!blocker) {
      return NextResponse.json({ error: "Blocker not found" }, { status: 404 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isSuperAdmin = payload.role === "SYSTEM_ADMIN" || payload.role === "ADMIN";
    const isPM = project.techOwner && project.techOwner.toString() === payload.userId;
    const isOwner = blocker.ownerId && blocker.ownerId.toString() === payload.userId;
    const isCreator = blocker.createdBy && blocker.createdBy.toString() === payload.userId;

    if (!isSuperAdmin && !isPM && !isOwner && !isCreator) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only the blocker owner, creator, Project Manager, or Admin can update this blocker.",
        },
        { status: 403 }
      );
    }

    const prevStatus = blocker.status;

    // Apply updates
    if (title !== undefined) blocker.title = title;
    if (description !== undefined) blocker.description = description;
    if (type !== undefined) blocker.type = type;
    if (priority !== undefined) blocker.priority = priority;
    if (ownerId !== undefined) blocker.ownerId = ownerId;
    if (dueDate !== undefined) blocker.dueDate = dueDate ? new Date(dueDate) : undefined;

    if (status !== undefined) {
      blocker.status = status;
      if (status === "Resolved" && prevStatus !== "Resolved") {
        blocker.resolvedBy = payload.userId as any;
        blocker.resolvedAt = new Date();
        blocker.resolutionNote = resolutionNote || "Resolved by user";
      } else if (status !== "Resolved") {
        blocker.resolvedBy = undefined;
        blocker.resolvedAt = undefined;
        blocker.resolutionNote = undefined;
      }
    }

    if (resolutionNote !== undefined && blocker.status === "Resolved") {
      blocker.resolutionNote = resolutionNote;
    }

    await blocker.save();

    // Trigger Notification if blocker resolved
    if (status === "Resolved" && prevStatus !== "Resolved") {
      if (project.createdBy.toString() !== payload.userId) {
        await Notification.create({
          recipientId: project.createdBy,
          projectId: id,
          type: "BLOCKER_RESOLVED",
          title: "Blocker Resolved",
          message: `The blocker "${blocker.title}" for project "${project.clientDetails.companyName}" has been resolved.`,
        });
      }
    }

    const populatedBlocker = await ProjectBlocker.findById(blocker._id)
      .populate("ownerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("resolvedBy", "name email role");

    return NextResponse.json({ data: populatedBlocker }, { status: 200 });
  } catch (error: any) {
    console.error("Blocker update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; blockerId: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { id, blockerId } = await params;
    await dbConnect();

    const blocker = await ProjectBlocker.findById(blockerId);
    if (!blocker) {
      return NextResponse.json({ error: "Blocker not found" }, { status: 404 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isSuperAdmin = payload.role === "SYSTEM_ADMIN" || payload.role === "ADMIN";
    const isPM = project.techOwner && project.techOwner.toString() === payload.userId;
    const isOwner = blocker.ownerId && blocker.ownerId.toString() === payload.userId;
    const isCreator = blocker.createdBy && blocker.createdBy.toString() === payload.userId;

    if (!isSuperAdmin && !isPM && !isOwner && !isCreator) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only the blocker owner, creator, Project Manager, or Admin can delete this blocker.",
        },
        { status: 403 }
      );
    }

    await ProjectBlocker.findByIdAndDelete(blockerId);

    return NextResponse.json({ message: "Blocker deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Blocker delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
