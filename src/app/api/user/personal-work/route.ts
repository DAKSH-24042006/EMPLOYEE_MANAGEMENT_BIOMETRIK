import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { User } from "@/lib/models/User";
import { WorkItem } from "@/lib/models/WorkItem";
import { Task } from "@/lib/models/Task";
import { Bug } from "@/lib/models/Bug";

export const dynamic = "force-dynamic";

// GET /api/user/personal-work — Fetch only assigned work items, tasks, and bugs for the authenticated user
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    const user = await User.findById(authResult.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userObjId = new mongoose.Types.ObjectId(String(user._id));

    // A. My Work Items (assigned to logged in user)
    const workItemsRaw = await WorkItem.find({
      $or: [{ assignee: userObjId }, { assignees: userObjId }],
    })
      .populate("projectId", "title clientDetails status")
      .sort({ updatedAt: -1 })
      .lean();

    const workItems = workItemsRaw.map((item: any) => ({
      _id: String(item._id),
      title: item.title,
      description: item.description,
      type: item.type,
      priority: item.priority || "Medium",
      status: item.status || "To Do",
      dueDate: item.dueDate || null,
      assignedDate: item.assignedDate || item.createdAt,
      projectId: item.projectId?._id ? String(item.projectId._id) : null,
      projectName:
        item.projectId?.title || item.projectId?.clientDetails?.companyName || "Unassigned Project",
    }));

    // B. My Tasks (assigned to logged in user)
    const tasksRaw = await Task.find({
      assignedTo: userObjId,
    })
      .populate("projectId", "title clientDetails status")
      .sort({ dueDate: 1 })
      .lean();

    const tasks = tasksRaw.map((task: any) => {
      const isOverdue =
        task.dueDate &&
        task.status !== "Completed" &&
        task.status !== "Cancelled" &&
        new Date(task.dueDate) < new Date();

      return {
        _id: String(task._id),
        title: task.title,
        description: task.description,
        status: task.status || "Pending",
        priority: "Medium",
        dueDate: task.dueDate || null,
        assignedDate: task.assignedDate || task.createdAt,
        isOverdue: Boolean(isOverdue),
        projectId: task.projectId?._id ? String(task.projectId._id) : null,
        projectName:
          task.projectId?.title ||
          task.projectId?.clientDetails?.companyName ||
          "Unassigned Project",
      };
    });

    // C. My Bugs (assigned to logged in user)
    const bugsRaw = await Bug.find({
      assignee: userObjId,
    })
      .populate("projectId", "title clientDetails status")
      .populate("reportedBy", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    const myBugs = bugsRaw.map((bug: any) => ({
      _id: String(bug._id),
      bugId: bug.bugId,
      title: bug.title,
      severity: bug.severity || "Medium",
      status: bug.status || "OPEN",
      description: bug.description,
      assignedAt: bug.assignedAt || bug.createdAt,
      reportedAt: bug.reportedAt || bug.createdAt,
      reportedByName: bug.reportedBy?.name || "Unknown",
      projectId: bug.projectId?._id ? String(bug.projectId._id) : null,
      projectName:
        bug.projectId?.title || bug.projectId?.clientDetails?.companyName || "Unassigned Project",
    }));

    // Reported Bugs (reported by logged-in user, but assigned to someone else)
    const reportedRaw = await Bug.find({
      reportedBy: userObjId,
      assignee: { $ne: userObjId },
    })
      .populate("projectId", "title clientDetails status")
      .populate("assignee", "name email")
      .sort({ updatedAt: -1 })
      .lean();

    const reportedBugs = reportedRaw.map((bug: any) => ({
      _id: String(bug._id),
      bugId: bug.bugId,
      title: bug.title,
      severity: bug.severity || "Medium",
      status: bug.status || "OPEN",
      description: bug.description,
      assignedAt: bug.assignedAt || bug.createdAt,
      reportedAt: bug.reportedAt || bug.createdAt,
      assigneeName: bug.assignee?.name || "Unassigned",
      projectId: bug.projectId?._id ? String(bug.projectId._id) : null,
      projectName:
        bug.projectId?.title || bug.projectId?.clientDetails?.companyName || "Unassigned Project",
    }));

    return NextResponse.json({
      success: true,
      data: {
        workItems,
        tasks,
        bugs: myBugs,
        reportedBugs,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch personal work data:", error);
    return NextResponse.json(
      { error: "Internal server error fetching personal work" },
      { status: 500 }
    );
  }
}
