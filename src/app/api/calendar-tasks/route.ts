import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { CalendarTask } from "@/lib/models/CalendarTask";
import { WorkItem } from "@/lib/models/WorkItem";
import { Sprint } from "@/lib/models/Sprint";
import { Project } from "@/lib/models/Project";
import { Task } from "@/lib/models/Task";
import { User } from "@/lib/models/User";
import { Role } from "@/lib/constants";
import { getProjectViewFilter } from "@/lib/projectAccess";
import { verifyJwt } from "@/lib/auth";

import { GoogleToken } from "@/lib/models/GoogleToken";
import { createCalendarEvent } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const includeAll = searchParams.get("includeAll") === "true";
    const projectId = searchParams.get("projectId");

    const personalQuery: any = { createdBy: payload.userId };
    let dateFilter: any = null;

    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);

      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
        dateFilter = {
          $gte: sDate,
          $lte: eDate,
        };
        personalQuery.date = dateFilter;
      }
    }

    const personalTasks = await CalendarTask.find(personalQuery)
      .sort({ date: 1, createdAt: 1 })
      .lean();

    const formattedPersonalTasks = personalTasks.map((t: any) => ({
      ...t,
      _id: String(t._id),
      itemType: "personal",
      isPersonal: true,
      color:
        t.color ||
        (t.priority === "Urgent"
          ? "#f55c5c"
          : t.priority === "High"
            ? "#f58c42"
            : t.priority === "Medium"
              ? "#f5c542"
              : "#6c8ef5"),
    }));

    if (!includeAll) {
      return NextResponse.json(formattedPersonalTasks, {
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      });
    }

    const isSystemAdmin =
      payload.role === Role.SYSTEM_ADMIN ||
      payload.role === "SYSTEM_ADMIN" ||
      payload.role === "ADMIN";

    // Build scoped queries to prevent seeing other users' tasks
    const workItemQuery: any = {};
    const taskQuery: any = {};
    const sprintQuery: any = {};
    const projectQuery: any = {};

    if (dateFilter) {
      workItemQuery.dueDate = dateFilter;
      taskQuery.dueDate = dateFilter;
      sprintQuery.$or = [{ endDate: dateFilter }, { startDate: dateFilter }];

      projectQuery["timeline.startDate"] = { $lte: dateFilter.$lte };
      projectQuery["timeline.endDate"] = { $gte: dateFilter.$gte };
    }

    if (!isSystemAdmin) {
      // Regular employees can ONLY see tasks and work items assigned to THEM
      workItemQuery.assignee = payload.userId;
      taskQuery.assignedTo = payload.userId;

      // Ensure projects are also restricted to projects they have permission to access
      const projectFilter = await getProjectViewFilter(payload.userId, payload.role);
      const allowedProjects = await Project.find(projectFilter).distinct("_id");

      if (projectId) {
        const hasAccess = allowedProjects.some((id: any) => String(id) === String(projectId));
        if (hasAccess) {
          workItemQuery.projectId = projectId;
          taskQuery.projectId = projectId;
          sprintQuery.projectId = projectId;
          projectQuery._id = projectId;
        } else {
          workItemQuery.projectId = null;
          taskQuery.projectId = null;
          sprintQuery.projectId = null;
          projectQuery._id = null;
        }
      } else {
        workItemQuery.projectId = { $in: allowedProjects };
        taskQuery.projectId = { $in: allowedProjects };
        sprintQuery.projectId = { $in: allowedProjects };
        projectQuery._id = { $in: allowedProjects };
      }
    } else {
      // System admin can filter by specific project if requested
      if (projectId) {
        workItemQuery.projectId = projectId;
        taskQuery.projectId = projectId;
        sprintQuery.projectId = projectId;
        projectQuery._id = projectId;
      }
    }

    const [workItems, regularTasks, sprints, projects] = await Promise.all([
      WorkItem.find(workItemQuery)
        .populate("projectId", "title clientDetails")
        .populate("assignee", "name email")
        .populate("sprint", "name")
        .lean(),
      Task.find(taskQuery)
        .populate("projectId", "title clientDetails")
        .populate("assignedTo", "name email")
        .lean(),
      Sprint.find(sprintQuery).populate("projectId", "title").lean(),
      Project.find(projectQuery).lean(),
    ]);

    const formattedWorkItems = workItems.map((w: any) => {
      const isUrgent = w.priority === "Urgent";
      const isHigh = w.priority === "High";
      return {
        _id: String(w._id),
        title: w.title,
        description: w.description || "",
        date: w.dueDate ? new Date(w.dueDate).toISOString() : new Date().toISOString(),
        priority: w.priority || "Medium",
        status: w.status === "Done" ? "Done" : w.status === "In Progress" ? "In Progress" : "Todo",
        rawStatus: w.status,
        color: isUrgent ? "#ff4d4f" : isHigh ? "#fa8c16" : "#1890ff",
        itemType: "work_item",
        isPersonal: false,
        projectName: w.projectId?.title || "Project Work Item",
        projectId: w.projectId?._id ? String(w.projectId._id) : undefined,
        assigneeName: w.assignee?.name || "Unassigned",
        progress: w.progress || 0,
        type: w.type,
      };
    });

    const formattedRegularTasks = regularTasks.map((t: any) => ({
      _id: String(t._id),
      title: t.title,
      description: t.description || "",
      date: t.dueDate ? new Date(t.dueDate).toISOString() : new Date().toISOString(),
      priority: "Medium",
      status: t.status === "Completed" ? "Done" : "Todo",
      rawStatus: t.status,
      color: "#00897b",
      itemType: "task",
      isPersonal: false,
      projectName: t.projectId?.title || "Project Task",
      projectId: t.projectId?._id ? String(t.projectId._id) : undefined,
      assigneeName: t.assignedTo?.name || "Assigned",
    }));

    const formattedSprints = sprints.map((s: any) => ({
      _id: String(s._id),
      title: `Sprint Deadline: ${s.name}`,
      description: s.goal || "Sprint deadline",
      date: s.endDate ? new Date(s.endDate).toISOString() : new Date().toISOString(),
      priority: "High",
      status: s.status === "Completed" ? "Done" : s.status === "Active" ? "In Progress" : "Todo",
      rawStatus: s.status,
      color: "#52c41a",
      itemType: "sprint",
      isPersonal: false,
      projectName: s.projectId?.title || "Project Sprint",
      projectId: s.projectId?._id ? String(s.projectId._id) : undefined,
      startDate: s.startDate,
      endDate: s.endDate,
    }));

    const formattedProjects = projects
      .filter((p: any) => p.timeline?.startDate && p.timeline?.endDate)
      .map((p: any) => ({
        _id: String(p._id),
        title: `Project: ${p.title}`,
        description: p.description || "Project Duration",
        date: new Date(p.timeline.startDate).toISOString(),
        priority: p.priority || "Medium",
        status: p.status === "Completed" ? "Done" : "In Progress",
        rawStatus: p.status,
        color: "#8b5cf6",
        itemType: "project",
        isPersonal: false,
        projectName: p.title,
        projectId: String(p._id),
        startDate: new Date(p.timeline.startDate).toISOString(),
        endDate: new Date(p.timeline.endDate).toISOString(),
      }));

    const allEvents = [
      ...formattedPersonalTasks,
      ...formattedWorkItems,
      ...formattedRegularTasks,
      ...formattedSprints,
      ...formattedProjects,
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json(allEvents, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error: any) {
    console.error("GET Calendar Tasks Error:", error);
    return NextResponse.json({ error: "Failed to fetch calendar tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    const hasGoogleToken = await GoogleToken.findOne({ userId: payload.userId });
    const shouldSync = !!hasGoogleToken;

    const newTask = new CalendarTask({
      ...body,
      createdBy: payload.userId,
      syncStatus: "Not synced",
    });

    if (shouldSync) {
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const dashboardUrl = `${origin}/calendar`;
      const statusPrefix =
        body.status === "Done" ? "[COMPLETED] " : body.status === "Cancelled" ? "[CANCELLED] " : "";
      const summary = `${statusPrefix}Task: ${body.title}`;
      const desc = body.description || "No description provided.";

      try {
        const eventId = await createCalendarEvent(payload.userId, {
          summary,
          description: desc,
          dueDate: new Date(body.date),
          dashboardUrl,
        });

        if (eventId) {
          newTask.googleCalendarEventId = eventId;
          newTask.syncStatus = "Synced";
        } else {
          newTask.syncStatus = "Sync failed";
          newTask.syncError = "Failed to create Google calendar event";
        }
      } catch (syncErr: any) {
        console.error("Google Calendar Sync Error:", syncErr);
        newTask.syncStatus = "Sync failed";
        newTask.syncError = syncErr.message || "Failed to create Google calendar event";
      }
    }

    await newTask.save();
    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error("POST Calendar Task Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create calendar task" },
      { status: 500 }
    );
  }
}
