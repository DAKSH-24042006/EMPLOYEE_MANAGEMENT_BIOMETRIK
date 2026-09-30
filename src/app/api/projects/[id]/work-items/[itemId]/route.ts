import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { WorkItem } from "@/lib/models/WorkItem";
import { verifyJwt } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { canUserViewProject } from "@/lib/projectAccess";

export const dynamic = "force-dynamic";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, itemId } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to this project" },
        { status: 403 }
      );
    }

    const workItem = await WorkItem.findById(itemId)
      .populate("assignee", "name email role")
      .populate("assignees", "name email role")
      .populate("sprint", "name status")
      .populate("comments.author", "name email role")
      .populate("workLogs.loggedBy", "name email role")
      .exec();

    if (!workItem) {
      return NextResponse.json({ error: "Work item not found" }, { status: 404 });
    }

    return NextResponse.json(
      { data: workItem },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: any) {
    console.error("GET WorkItem Detail Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Sales cannot update work items
    if (payload.role === "SALES_TEAM" || payload.role === "SALES") {
      return NextResponse.json(
        { error: "Forbidden: Sales cannot edit work items" },
        { status: 403 }
      );
    }

    const { id, itemId } = await params;
    const body = await req.json();

    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to this project" },
        { status: 403 }
      );
    }

    const workItem = await WorkItem.findById(itemId);
    if (!workItem) {
      return NextResponse.json({ error: "Work item not found" }, { status: 404 });
    }

    const prevStatus = workItem.status;

    // Basic updates
    if (body.title !== undefined) workItem.title = body.title;
    if (body.description !== undefined) workItem.description = body.description;
    if (body.type !== undefined) workItem.type = body.type;
    if (body.module !== undefined) workItem.module = body.module;
    if (body.priority !== undefined) workItem.priority = body.priority;
    if (body.status !== undefined) workItem.status = body.status;
    if (body.assignee !== undefined) workItem.assignee = body.assignee || undefined;
    if (body.assignees !== undefined) workItem.assignees = body.assignees || [];
    if (body.sprint !== undefined) workItem.sprint = body.sprint || undefined;
    if (body.dueDate !== undefined)
      workItem.dueDate = body.dueDate ? new Date(body.dueDate) : undefined;
    if (body.estimatedHours !== undefined) workItem.estimatedHours = body.estimatedHours;
    if (body.progress !== undefined) workItem.progress = body.progress;

    // Append Comments
    if (body.newComment?.text) {
      workItem.comments.push({
        text: body.newComment.text,
        author: payload.userId as any,
        createdAt: new Date(),
      });
      await logActivity(
        id,
        "work_item",
        `Added comment to work item "${workItem.title}"`,
        payload.userId
      );
    }

    // Append Work Logs & update actualHours
    if (body.newWorkLog) {
      const { date, hoursSpent, description } = body.newWorkLog;
      if (!date || !hoursSpent) {
        return NextResponse.json(
          { error: "Work log requires date and hours spent" },
          { status: 400 }
        );
      }
      workItem.workLogs.push({
        date: new Date(date),
        hoursSpent: Number(hoursSpent),
        description: description || "",
        loggedBy: payload.userId as any,
      });

      // Recalculate total actual hours
      workItem.actualHours = workItem.workLogs.reduce(
        (sum, log) => sum + Number(log.hoursSpent),
        0
      );

      await logActivity(
        id,
        "work_log",
        `Logged ${hoursSpent} hours on "${workItem.title}": "${description || "No description"}"`,
        payload.userId
      );
    }

    // Append Attachments
    if (body.newAttachment) {
      const { name, url } = body.newAttachment;
      if (name && url) {
        workItem.attachments.push({ name, url });
        await logActivity(
          id,
          "work_item",
          `Uploaded attachment "${name}" to work item "${workItem.title}"`,
          payload.userId
        );
      }
    }

    await workItem.save();

    if (body.status !== undefined && body.status !== prevStatus) {
      await logActivity(
        id,
        "work_item",
        `Updated work item "${workItem.title}" status from "${prevStatus}" to "${workItem.status}"`,
        payload.userId
      );
    }

    return NextResponse.json(
      { data: workItem },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: any) {
    console.error("PUT WorkItem Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, itemId } = await params;
    await dbConnect();

    const workItem = await WorkItem.findById(itemId);
    if (!workItem) {
      return NextResponse.json({ error: "Work item not found" }, { status: 404 });
    }

    // Permissions check: Admins, Tech Managers, or the creator can delete
    if (
      payload.role !== "ADMIN" &&
      payload.role !== "SYSTEM_ADMIN" &&
      payload.role !== "TECH_MANAGER" &&
      workItem.createdBy.toString() !== payload.userId
    ) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient privileges to delete this work item" },
        { status: 403 }
      );
    }

    await WorkItem.findByIdAndDelete(itemId);
    await logActivity(id, "work_item", `Deleted work item "${workItem.title}"`, payload.userId);

    return NextResponse.json({ message: "Work item deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE WorkItem Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
