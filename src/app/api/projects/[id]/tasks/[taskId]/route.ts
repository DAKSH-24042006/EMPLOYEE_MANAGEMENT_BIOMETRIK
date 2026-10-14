import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { Task } from "@/lib/models/Task";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/googleCalendar";
import { GoogleToken } from "@/lib/models/GoogleToken";
import { logActivity } from "@/lib/activity";
import { canUserViewProject } from "@/lib/projectAccess";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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

    const { id, taskId } = await params;
    const body = await req.json();
    const { title, description, dueDate, assignedTo, syncToGoogleCalendar } = body;

    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to this project" },
        { status: 403 }
      );
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isProjectLead =
      payload.role === "SYSTEM_ADMIN" ||
      payload.role === "ADMIN" ||
      (project.techOwner && project.techOwner.toString() === payload.userId);

    const isAssignee = task.assignedTo && task.assignedTo.toString() === payload.userId;

    if (!isProjectLead && !isAssignee) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Only the Project Manager, Admin, or the task assignee can update this task.",
        },
        { status: 403 }
      );
    }

    // Assignees who are not leads can only update status
    if (!isProjectLead) {
      if (
        title !== undefined ||
        description !== undefined ||
        dueDate !== undefined ||
        assignedTo !== undefined
      ) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Only the Project Manager or Admin can modify task details or reassign tasks.",
          },
          { status: 403 }
        );
      }
    }

    const prevStatus = task.status;
    const prevSync = task.syncToGoogleCalendar;
    const prevAssignee = task.assignedTo.toString();
    const prevEventId = task.googleCalendarEventId;

    // Apply updates
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);
    if (assignedTo !== undefined) {
      if (task.assignedTo?.toString() !== assignedTo?.toString()) {
        task.assignedDate = new Date();
      }
      task.assignedTo = assignedTo;
    }
    if (body.status !== undefined) task.status = body.status;

    const currentAssignee = task.assignedTo.toString();
    console.log(`[TaskUpdate] Updating task: "${task.title}" assigned to: "${currentAssignee}"`);
    const hasGoogleToken = await GoogleToken.findOne({ userId: currentAssignee });
    const shouldSync = !!hasGoogleToken;
    console.log(`[TaskUpdate] Assignee connected to Google Calendar: ${shouldSync}`);
    task.syncToGoogleCalendar = shouldSync;

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const dashboardUrl = `${origin}/projects/${id}`;
    const statusPrefix =
      task.status === "Completed"
        ? "[COMPLETED] "
        : task.status === "Cancelled"
          ? "[CANCELLED] "
          : "";
    const summary = `${statusPrefix}[${project.clientDetails.companyName}] Task: ${task.title}`;
    const desc = task.description || "No description provided.";

    // Logic for Google Calendar Sync
    try {
      if (shouldSync) {
        // Case 1: Was synced, but assignee changed
        if (prevSync && prevEventId && prevAssignee !== currentAssignee) {
          // Delete event from previous assignee's calendar
          try {
            await deleteCalendarEvent(prevAssignee, prevEventId);
          } catch (delErr) {
            console.error("Failed to delete previous assignee event:", delErr);
          }

          // Create event in new assignee's calendar
          const newEventId = await createCalendarEvent(currentAssignee, {
            summary,
            description: desc,
            dueDate: task.dueDate,
            dashboardUrl,
          });

          if (newEventId) {
            task.googleCalendarEventId = newEventId;
            task.syncStatus = "Synced";
            task.syncError = undefined;
          } else {
            task.googleCalendarEventId = undefined;
            task.syncStatus = "Sync failed";
            task.syncError = "Failed to create event on new assignee calendar";
          }
        }
        // Case 2: Was synced, and assignee is same -> Update calendar
        else if (prevSync && prevEventId) {
          const ok = await updateCalendarEvent(currentAssignee, prevEventId, {
            summary,
            description: desc,
            dueDate: task.dueDate,
            dashboardUrl,
          });
          if (ok) {
            task.syncStatus = "Synced";
            task.syncError = undefined;
          } else {
            task.syncStatus = "Sync failed";
            task.syncError = "Failed to update Google calendar event";
          }
        }
        // Case 3: Wasn't synced (or sync failed) -> Create event
        else {
          const newEventId = await createCalendarEvent(currentAssignee, {
            summary,
            description: desc,
            dueDate: task.dueDate,
            dashboardUrl,
          });

          if (newEventId) {
            task.googleCalendarEventId = newEventId;
            task.syncStatus = "Synced";
            task.syncError = undefined;
          } else {
            task.syncStatus = "Sync failed";
            task.syncError = "Failed to create Google calendar event";
          }
        }
      } else {
        // Case 4: Sync toggled off -> Delete existing calendar event if present
        if (prevEventId) {
          try {
            await deleteCalendarEvent(prevAssignee, prevEventId);
          } catch (delErr) {
            console.error("Failed to delete event on sync turn-off:", delErr);
          }
          task.googleCalendarEventId = undefined;
        }
        task.syncStatus = "Not synced";
        task.syncError = undefined;
      }
    } catch (syncErr: any) {
      console.error("Google Calendar Sync error during update:", syncErr);
      task.syncStatus = "Sync failed";
      task.syncError = syncErr.message || "Google Calendar sync failed during update";
    }

    await task.save();

    if (body.status !== undefined && body.status !== prevStatus) {
      await logActivity(
        id,
        "task",
        `Updated task "${task.title}" status from "${prevStatus}" to "${task.status}"`,
        payload.userId
      );
    } else {
      await logActivity(id, "task", `Updated task "${task.title}" details`, payload.userId);
    }

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    return NextResponse.json(
      { data: populatedTask },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: any) {
    console.error("Task update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
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

    const { id, taskId } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to this project" },
        { status: 403 }
      );
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isProjectLead =
      payload.role === "SYSTEM_ADMIN" ||
      payload.role === "ADMIN" ||
      (project.techOwner && project.techOwner.toString() === payload.userId);

    if (!isProjectLead) {
      return NextResponse.json(
        { error: "Forbidden: Only the Project Manager or Admin can delete tasks." },
        { status: 403 }
      );
    }

    // Delete calendar event if it was synced
    if (task.googleCalendarEventId) {
      await deleteCalendarEvent(task.assignedTo.toString(), task.googleCalendarEventId);
    }

    await Task.findByIdAndDelete(taskId);

    await logActivity(id, "task", `Deleted task "${task.title}"`, payload.userId);

    return NextResponse.json(
      { message: "Task successfully deleted" },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
