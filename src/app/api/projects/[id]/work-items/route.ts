import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { WorkItem } from "@/lib/models/WorkItem";
import { Project } from "@/lib/models/Project";
import { Role } from "@/lib/constants";
import { verifyJwt } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

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
    const { searchParams } = new URL(req.url);

    await dbConnect();

    // Build query object
    const query: any = { projectId: id };

    const status = searchParams.get("status");
    if (status) query.status = status;

    const assignee = searchParams.get("assignee");
    if (assignee) query.assignee = assignee;

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

    const project = await Project.findById(id).select("techOwner");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // STRICT CHECK: Only the Project Lead (techOwner) or System Admin can create tasks
    const isProjectLead =
      payload.role === Role.SYSTEM_ADMIN ||
      (project.techOwner && project.techOwner.toString() === payload.userId);

    if (!isProjectLead) {
      return NextResponse.json(
        { error: "Forbidden: Only the Project Lead can create tasks and assign them to team members." },
        { status: 403 }
      );
    }

    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const newItem = await WorkItem.create({
      projectId: id,
      title: body.title,
      description: body.description || "",
      type: body.type || "Feature",
      module: body.module || "",
      priority: body.priority || "Medium",
      status: body.status || "Backlog",
      assignee: body.assignee || undefined,
      sprint: body.sprint || undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      estimatedHours: body.estimatedHours || 0,
      createdBy: payload.userId,
    });

    await logActivity(id, "work_item", `Created work item "${body.title}"`, payload.userId);

    return NextResponse.json({ data: newItem }, { status: 201 });
  } catch (error: any) {
    console.error("POST WorkItem Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
