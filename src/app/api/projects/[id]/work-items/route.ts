import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { WorkItem } from "@/lib/models/WorkItem";
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

    // Sales cannot create work items
    if (payload.role === "SALES_TEAM" || payload.role === "SALES") {
      return NextResponse.json({ error: "Forbidden: Sales cannot create work items" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await dbConnect();

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
