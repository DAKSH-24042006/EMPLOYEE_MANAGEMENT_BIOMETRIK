import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { Task } from "@/lib/models/Task";
import { User } from "@/lib/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { createCalendarEvent } from "@/lib/googleCalendar";
import { Notification } from "@/lib/models/Notification";

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

    const tasks = await Task.find({ projectId: id })
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role")
      .sort({ dueDate: 1 });

    return NextResponse.json({ data: tasks }, { status: 200 });
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
    const { title, description, dueDate, assignedTo, syncToGoogleCalendar } = body;

    if (!title || !dueDate || !assignedTo) {
      return NextResponse.json({ error: "Missing required fields (title, dueDate, assignedTo)" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const assignee = await User.findById(assignedTo);
    if (!assignee) {
      return NextResponse.json({ error: "Assignee not found" }, { status: 404 });
    }

    // Create the task in DB
    const task = new Task({
      projectId: id,
      title,
      description: description || "",
      dueDate: new Date(dueDate),
      assignedTo,
      syncToGoogleCalendar: !!syncToGoogleCalendar,
      createdBy: payload.userId,
      syncStatus: "Not synced",
    });

    if (syncToGoogleCalendar) {
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const dashboardUrl = `${origin}/projects/${id}`;
      const summary = `[${project.clientDetails.companyName}] Task: ${title}`;
      const desc = description || "No description provided.";

      const eventId = await createCalendarEvent(assignedTo, {
        summary,
        description: desc,
        dueDate: new Date(dueDate),
        dashboardUrl,
      });

      if (eventId) {
        task.googleCalendarEventId = eventId;
        task.syncStatus = "Synced";
      } else {
        task.syncStatus = "Sync failed";
        task.syncError = "Assignee has not connected Google Calendar or token expired";
      }
    }

    await task.save();

    // Create in-app notification for task assignment
    await Notification.create({
      recipientId: assignedTo,
      projectId: id,
      type: "TASK_ASSIGNED",
      title: "New Task Assigned",
      message: `You have been assigned a new task: "${title}" for project "${project.clientDetails.companyName}".`,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignedTo", "name email role")
      .populate("createdBy", "name email role");

    return NextResponse.json({ data: populatedTask }, { status: 201 });
  } catch (error: any) {
    console.error("Task creation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
