import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { CalendarTask } from "@/lib/models/CalendarTask";
import { verifyJwt } from "@/lib/auth";

import { GoogleToken } from "@/lib/models/GoogleToken";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/lib/googleCalendar";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

    // Find the task
    const task = await CalendarTask.findOne({ _id: id, createdBy: payload.userId });
    if (!task) {
      return NextResponse.json(
        { error: "Task not found or unauthorized" },
        { status: 404 }
      );
    }

    const prevEventId = task.googleCalendarEventId;

    // Apply updates
    if (body.title !== undefined) task.title = body.title;
    if (body.description !== undefined) task.description = body.description;
    if (body.date !== undefined) task.date = new Date(body.date);
    if (body.priority !== undefined) task.priority = body.priority;
    if (body.status !== undefined) task.status = body.status;
    if (body.color !== undefined) task.color = body.color;

    // Sync check
    const hasGoogleToken = await GoogleToken.findOne({ userId: payload.userId });
    const shouldSync = !!hasGoogleToken;

    if (shouldSync) {
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const dashboardUrl = `${origin}/calendar`;
      const statusPrefix = task.status === "Done" ? "[COMPLETED] " : task.status === "Cancelled" ? "[CANCELLED] " : "";
      const summary = `${statusPrefix}Task: ${task.title}`;
      const desc = task.description || "No description provided.";

      try {
        if (prevEventId) {
          // Update event
          const ok = await updateCalendarEvent(payload.userId, prevEventId, {
            summary,
            description: desc,
            dueDate: task.date,
            dashboardUrl,
          });
          if (ok) {
            task.syncStatus = "Synced";
            task.syncError = undefined;
          } else {
            task.syncStatus = "Sync failed";
            task.syncError = "Failed to update Google calendar event";
          }
        } else {
          // Create event
          const eventId = await createCalendarEvent(payload.userId, {
            summary,
            description: desc,
            dueDate: task.date,
            dashboardUrl,
          });
          if (eventId) {
            task.googleCalendarEventId = eventId;
            task.syncStatus = "Synced";
            task.syncError = undefined;
          } else {
            task.syncStatus = "Sync failed";
            task.syncError = "Failed to create Google calendar event";
          }
        }
      } catch (syncErr: any) {
        console.error("Google Calendar Sync Error on calendar-task update:", syncErr);
        task.syncStatus = "Sync failed";
        task.syncError = syncErr.message || "Failed to update calendar event";
      }
    } else {
      // Creator doesn't have Google Calendar or disconnected it
      if (prevEventId) {
        try {
          await deleteCalendarEvent(payload.userId, prevEventId);
        } catch (delErr) {
          console.error("Failed to delete event on disconnect:", delErr);
        }
        task.googleCalendarEventId = undefined;
      }
      task.syncStatus = "Not synced";
      task.syncError = undefined;
    }

    await task.save();
    return NextResponse.json(task);
  } catch (error: any) {
    console.error("PUT Calendar Task Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update calendar task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    await dbConnect();

    // Find the task
    const task = await CalendarTask.findOne({ _id: id, createdBy: payload.userId });
    if (!task) {
      return NextResponse.json(
        { error: "Task not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete Google Calendar event if it exists
    if (task.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(payload.userId, task.googleCalendarEventId);
      } catch (delErr) {
        console.error("Failed to delete calendar task from Google Calendar:", delErr);
      }
    }

    await CalendarTask.deleteOne({ _id: id });
    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Calendar Task Error:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar task" },
      { status: 500 }
    );
  }
}
