import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { Task } from "@/lib/models/Task";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/googleCalendar";

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

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const prevSync = task.syncToGoogleCalendar;
    const prevAssignee = task.assignedTo.toString();
    const prevEventId = task.googleCalendarEventId;

    // Apply updates
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (syncToGoogleCalendar !== undefined) task.syncToGoogleCalendar = !!syncToGoogleCalendar;

    const currentAssignee = task.assignedTo.toString();
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const dashboardUrl = `${origin}/projects/${id}`;
    const summary = `[${project.clientDetails.companyName}] Task: ${task.title}`;
    const desc = task.description || "No description provided.";

    // Logic for Google Calendar Sync
    if (task.syncToGoogleCalendar) {
      // Case 1: Was synced, but assignee changed
      if (prevSync && prevEventId && prevAssignee !== currentAssignee) {
        // Delete event from previous assignee's calendar
        await deleteCalendarEvent(prevAssignee, prevEventId);
        
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
          task.syncError = "New assignee has not connected Google Calendar or token expired";
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
          task.syncError = "Update failed, token expired or event deleted";
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
          task.syncError = "Assignee has not connected Google Calendar or token expired";
        }
      }
    } else {
      // Case 4: Sync toggled off -> Delete existing calendar event if present
      if (prevEventId) {
        await deleteCalendarEvent(prevAssignee, prevEventId);
        task.googleCalendarEventId = undefined;
      }
      task.syncStatus = "Not synced";
      task.syncError = undefined;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    return NextResponse.json({ data: populatedTask }, { status: 200 });
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

    const { taskId } = await params;
    await dbConnect();

    const task = await Task.findById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete calendar event if it was synced
    if (task.googleCalendarEventId) {
      await deleteCalendarEvent(task.assignedTo.toString(), task.googleCalendarEventId);
    }

    await Task.findByIdAndDelete(taskId);

    return NextResponse.json({ message: "Task successfully deleted" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
