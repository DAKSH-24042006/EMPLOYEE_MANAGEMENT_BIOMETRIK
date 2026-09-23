import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { ProjectBlocker } from "@/lib/models/ProjectBlocker";
import { Notification } from "@/lib/models/Notification";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { canUserViewProject } from "@/lib/projectAccess";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access denied to this project" }, { status: 403 });
    }

    const blockers = await ProjectBlocker.find({ projectId: id })
      .populate("ownerId", "name email role")
      .populate("createdBy", "name email role")
      .populate("resolvedBy", "name email role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ data: blockers }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const body = await req.json();
    const { title, description, type, priority, ownerId, dueDate } = body;

    if (!title || !type || !ownerId) {
      return NextResponse.json({ error: "Missing required fields (title, type, ownerId)" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const canView = await canUserViewProject(project, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access denied to this project" }, { status: 403 });
    }

    const blocker = await ProjectBlocker.create({
      projectId: id,
      title,
      description: description || "",
      type,
      priority: priority || "Medium",
      ownerId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: payload.userId,
      status: "Open",
    });

    // Notify blocker owner
    if (ownerId !== payload.userId) {
      await Notification.create({
        recipientId: ownerId,
        projectId: id,
        type: "BLOCKER_ADDED",
        title: "Blocker Assigned to You",
        message: `You have been assigned as the owner of a new blocker: "${title}" for project "${project.clientDetails.companyName}".`,
      });
    }

    // Notify project creator (if not the creator of blocker)
    if (project.createdBy.toString() !== payload.userId) {
      await Notification.create({
        recipientId: project.createdBy,
        projectId: id,
        type: "BLOCKER_ADDED",
        title: "Blocker Added to Project",
        message: `A new blocker has been raised on project "${project.clientDetails.companyName}": "${title}".`,
      });
    }

    const populatedBlocker = await ProjectBlocker.findById(blocker._id)
      .populate("ownerId", "name email role")
      .populate("createdBy", "name email role");

    return NextResponse.json({ data: populatedBlocker }, { status: 201 });
  } catch (error: any) {
    console.error("Blocker creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
