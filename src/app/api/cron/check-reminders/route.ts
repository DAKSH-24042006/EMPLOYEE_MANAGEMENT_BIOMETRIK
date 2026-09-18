import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Task } from "@/lib/models/Task";
import { ProjectBlocker } from "@/lib/models/ProjectBlocker";
import { Project } from "@/lib/models/Project";
import { Notification } from "@/lib/models/Notification";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    // Secure token validation
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET not configured on server" },
        { status: 500 }
      );
    }
    if (!token || token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let notificationsCreated = 0;

    // Helper: Check if already notified in last 24 hours
    const alreadyNotified = async (recipientId: string, projectId: string, title: string) => {
      const existing = await Notification.findOne({
        recipientId,
        projectId,
        title,
        createdAt: { $gt: oneDayAgo },
      });
      return !!existing;
    };

    // 1. Task Overdue
    const overdueTasks = await Task.find({
      dueDate: { $lt: now },
      status: "Pending",
    }).populate("projectId");

    for (const task of overdueTasks) {
      const project = task.projectId as any;
      if (!project) continue;
      const title = `Task Overdue: "${task.title}"`;
      const recipient = task.assignedTo.toString();

      if (!(await alreadyNotified(recipient, project._id.toString(), title))) {
        await Notification.create({
          recipientId: task.assignedTo,
          projectId: project._id,
          type: "TASK_OVERDUE",
          title,
          message: `The task "${task.title}" for project "${project.clientDetails.companyName}" is overdue. Please complete it as soon as possible.`,
        });
        notificationsCreated++;
      }
    }

    // 2. Task Approaching
    const approachingTasks = await Task.find({
      dueDate: { $gt: now, $lt: oneDayFromNow },
      status: "Pending",
    }).populate("projectId");

    for (const task of approachingTasks) {
      const project = task.projectId as any;
      if (!project) continue;
      const title = `Task Approaching Deadline: "${task.title}"`;
      const recipient = task.assignedTo.toString();

      if (!(await alreadyNotified(recipient, project._id.toString(), title))) {
        await Notification.create({
          recipientId: task.assignedTo,
          projectId: project._id,
          type: "TASK_APPROACHING",
          title,
          message: `The task "${task.title}" for project "${project.clientDetails.companyName}" is due within 24 hours.`,
        });
        notificationsCreated++;
      }
    }

    // 3. Overdue Blockers
    const overdueBlockers = await ProjectBlocker.find({
      dueDate: { $lt: now },
      status: { $in: ["Open", "In Progress"] },
    }).populate("projectId");

    for (const blocker of overdueBlockers) {
      const project = blocker.projectId as any;
      if (!project) continue;
      const title = `Blocker Overdue: "${blocker.title}"`;
      
      // Notify blocker owner
      const ownerRecipient = blocker.ownerId.toString();
      if (!(await alreadyNotified(ownerRecipient, project._id.toString(), title))) {
        await Notification.create({
          recipientId: blocker.ownerId,
          projectId: project._id,
          type: "BLOCKER_OVERDUE",
          title,
          message: `You are the owner of an open blocker "${blocker.title}" on project "${project.clientDetails.companyName}" that is overdue.`,
        });
        notificationsCreated++;
      }

      // Notify project creator
      const creatorRecipient = project.createdBy.toString();
      if (creatorRecipient !== ownerRecipient && !(await alreadyNotified(creatorRecipient, project._id.toString(), title))) {
        await Notification.create({
          recipientId: project.createdBy,
          projectId: project._id,
          type: "BLOCKER_OVERDUE",
          title,
          message: `An open blocker "${blocker.title}" on project "${project.clientDetails.companyName}" is overdue.`,
        });
        notificationsCreated++;
      }
    }

    // 4. Stale Projects (no updates in 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const staleProjects = await Project.find({
      updatedAt: { $lt: sevenDaysAgo },
      status: { $nin: ["Completed", "Approved"] },
    });

    for (const project of staleProjects) {
      const title = `Project Stale: "${project.clientDetails.companyName}"`;
      const recipient = project.createdBy.toString();

      if (!(await alreadyNotified(recipient, project._id.toString(), title))) {
        await Notification.create({
          recipientId: project.createdBy,
          projectId: project._id,
          type: "PROJECT_STALE",
          title,
          message: `The requirement/project details for "${project.clientDetails.companyName}" have not been updated for over 7 days.`,
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Completed reminder checks. Generated ${notificationsCreated} new notifications.`,
    });
  } catch (error: any) {
    console.error("Cron check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
