import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { Sprint } from "@/lib/models/Sprint";
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; sprintId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (payload.role !== "ADMIN" && payload.role !== "SYSTEM_ADMIN" && payload.role !== "TECH_MANAGER") {
      return NextResponse.json({ error: "Forbidden: Sprints can only be managed by Tech Managers or Admins" }, { status: 403 });
    }

    const { id, sprintId } = await params;
    const body = await req.json();

    await dbConnect();
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    const oldStatus = sprint.status;

    if (body.name !== undefined) sprint.name = body.name;
    if (body.goal !== undefined) sprint.goal = body.goal;
    if (body.startDate !== undefined) sprint.startDate = new Date(body.startDate);
    if (body.endDate !== undefined) sprint.endDate = new Date(body.endDate);
    if (body.status !== undefined) sprint.status = body.status;

    await sprint.save();

    // Migrate incomplete tasks if requested
    if (body.moveIncompleteTasks && (body.targetSprintId !== undefined || body.moveIncompleteToSprintId !== undefined)) {
      const targetSprintId = body.targetSprintId !== undefined ? body.targetSprintId : body.moveIncompleteToSprintId;
      const newSprintVal = (targetSprintId && targetSprintId !== "backlog" && targetSprintId !== "unassigned") ? targetSprintId : null;
      const updatedRes = await WorkItem.updateMany(
        {
          projectId: id,
          sprint: sprintId,
          status: { $nin: ["Done", "Cancelled"] },
        },
        { $set: { sprint: newSprintVal } }
      );
      if (updatedRes.modifiedCount > 0) {
        const destName = newSprintVal ? "target sprint" : "Backlog";
        await logActivity(
          id,
          "sprint",
          `Moved ${updatedRes.modifiedCount} incomplete task(s) from sprint "${sprint.name}" to ${destName}`,
          payload.userId
        );
      }
    }

    if (oldStatus !== sprint.status) {
      await logActivity(
        id,
        "sprint",
        `Sprint "${sprint.name}" status changed from "${oldStatus}" to "${sprint.status}"`,
        payload.userId
      );
    } else {
      await logActivity(id, "sprint", `Updated sprint "${sprint.name}" details`, payload.userId);
    }

    return NextResponse.json({ data: sprint }, { status: 200 });
  } catch (error: any) {
    console.error("PUT Sprint Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; sprintId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (payload.role !== "ADMIN" && payload.role !== "SYSTEM_ADMIN" && payload.role !== "TECH_MANAGER") {
      return NextResponse.json({ error: "Forbidden: Sprints can only be managed by Tech Managers or Admins" }, { status: 403 });
    }

    const { id, sprintId } = await params;
    await dbConnect();

    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return NextResponse.json({ error: "Sprint not found" }, { status: 404 });
    }

    await Sprint.findByIdAndDelete(sprintId);
    await logActivity(id, "sprint", `Deleted sprint "${sprint.name}"`, payload.userId);

    return NextResponse.json({ message: "Sprint deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE Sprint Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
