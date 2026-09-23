import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { WorkItem } from "@/lib/models/WorkItem";
import { Project } from "@/lib/models/Project";
import { User } from "@/lib/models/User";
import { Role } from "@/lib/constants";
import { verifyJwt } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { canUserViewProject } from "@/lib/projectAccess";
import { sendTaskAssignmentEmail } from "@/lib/mailer";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access denied to this project" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    const project = await Project.findById(id).select("techOwner");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isProjectLead =
      payload.role === Role.SYSTEM_ADMIN ||
      payload.role === "ADMIN" ||
      payload.role === "TECH_MANAGER" ||
      (project.techOwner && project.techOwner.toString() === payload.userId);

    // Build query object
    const query: any = { projectId: id };

    // Strict access control: regular members can only see their own assigned tasks
    if (!isProjectLead) {
      query.assignee = payload.userId;
    } else {
      const assignee = searchParams.get("assignee");
      if (assignee && assignee !== "All") query.assignee = assignee;
    }

    const status = searchParams.get("status");
    if (status && status !== "All") query.status = status;

    const sprint = searchParams.get("sprint");
    if (sprint) query.sprint = sprint;

    const priority = searchParams.get("priority");
    if (priority) query.priority = priority;

    const overdue = searchParams.get("overdue");
    if (overdue === "true") {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ["Done", "Cancelled"] };
    }

    const workItems = await WorkItem.find(query)
      .populate("assignee", "name email role")
      .populate("sprint", "name status")
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({ data: workItems }, { status: 200 });
  } catch (error: any) {
    console.error("GET WorkItems Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access denied to this project" }, { status: 403 });
    }

    const project = await Project.findById(id).select("title clientDetails techOwner");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isProjectLead =
      payload.role === Role.SYSTEM_ADMIN ||
      payload.role === "ADMIN" ||
      (project.techOwner && project.techOwner.toString() === payload.userId);

    const body = await req.json();

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Role check: Regular team members can create tasks for THEMSELVES.
    // Only Project Managers and System Admins can assign tasks to other team members.
    let targetAssignee = body.assignee || undefined;
    if (!isProjectLead) {
      if (body.assignee && String(body.assignee) !== String(payload.userId)) {
        return NextResponse.json(
          { error: "Forbidden: Team members can only create tasks for themselves." },
          { status: 403 }
        );
      }
      targetAssignee = payload.userId; // Enforce assigning to self
    }

    const newItem = await WorkItem.create({
      projectId: id,
      title: body.title.trim(),
      description: body.description || "",
      type: body.type || "Feature",
      module: body.module || "",
      priority: body.priority || "Medium",
      status: body.status || "Backlog",
      assignee: targetAssignee,
      sprint: body.sprint || undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      estimatedHours: body.estimatedHours || 0,
      createdBy: payload.userId,
    });

    await logActivity(id, "work_item", `Created work item "${newItem.title}"`, payload.userId);

    // Send email notification with Project Manager CC'd in the background (non-blocking)
    if (targetAssignee) {
      Promise.all([
        User.findById(targetAssignee).select("name email"),
        project.techOwner ? User.findById(project.techOwner).select("name email") : null,
      ])
        .then(([assigneeUser, pmUser]) => {
          if (assigneeUser) {
            return sendTaskAssignmentEmail({
              task: newItem,
              assignee: assigneeUser,
              projectManager: pmUser,
              project,
            });
          }
        })
        .catch((mailErr) => {
          console.error("Failed to send task assignment email in background:", mailErr);
        });
    }

    const populatedItem = await WorkItem.findById(newItem._id)
      .populate("assignee", "name email role")
      .populate("sprint", "name status");

    return NextResponse.json({ data: populatedItem || newItem }, { status: 201 });
  } catch (error: any) {
    console.error("POST WorkItem Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
