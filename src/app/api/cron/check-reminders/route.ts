import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { Task } from "@/lib/models/Task";
import { WorkItem } from "@/lib/models/WorkItem";
import { ProjectBlocker } from "@/lib/models/ProjectBlocker";
import { Project } from "@/lib/models/Project";
import { User } from "@/lib/models/User";
import { Notification } from "@/lib/models/Notification";
import { verifyJwt } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { getEmailConfig, sendDeadlineReminderEmail } from "@/lib/mailer";
import dayjs from "dayjs";

export const dynamic = "force-dynamic";

async function isAuthorized(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && token === cronSecret) {
    return true;
  }

  // Also allow authenticated System Admins
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("token")?.value;
  if (sessionToken) {
    const payload = await verifyJwt(sessionToken);
    if (payload?.userId && (payload.role === Role.SYSTEM_ADMIN || payload.role === "ADMIN")) {
      return true;
    }
  }

  return false;
}

export async function GET(req: Request) {
  try {
    const authorized = await isAuthorized(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let notificationsCreated = 0;
    let emailsDispatched = 0;

    const emailConfig = await getEmailConfig();
    const reminderDaysBefore = emailConfig.reminderDaysBeforeDue || 1;
    const sendOnDueDate = emailConfig.sendOnDueDate ?? true;
    const overdueInterval = emailConfig.overdueIntervalDays || 2;

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

    // 1. Process WorkItem Deadlines & Reminders (Dynamic intervals + Nodemailer)
    const activeWorkItems = await WorkItem.find({
      status: { $nin: ["Done", "Completed", "Cancelled"] },
      dueDate: { $exists: true, $ne: null },
      assignee: { $exists: true, $ne: null },
    })
      .populate("projectId")
      .populate("assignee", "name email");

    const todayDayjs = dayjs().startOf("day");

    for (const wi of activeWorkItems) {
      const project = wi.projectId as any;
      const assignee = wi.assignee as any;
      if (!project || !assignee || !assignee.email) continue;

      const dueDayjs = dayjs(wi.dueDate).startOf("day");
      const diffDays = dueDayjs.diff(todayDayjs, "day"); // > 0: future, 0: today, < 0: overdue

      const lastSentTime = wi.lastReminderSentAt ? new Date(wi.lastReminderSentAt).getTime() : 0;
      const hoursSinceLastSent = (now.getTime() - lastSentTime) / (1000 * 60 * 60);

      // Fetch PM info if available
      let pmUser: any = null;
      if (project.techOwner) {
        pmUser = await User.findById(project.techOwner).select("name email");
      }

      // Case A: 1 Day Before (or configured reminderDaysBefore)
      if (diffDays === reminderDaysBefore && (wi.lastReminderType !== "approaching" || hoursSinceLastSent >= 24)) {
        const title = `Task Due Soon: "${wi.title}"`;
        if (!(await alreadyNotified(assignee._id.toString(), project._id.toString(), title))) {
          await Notification.create({
            recipientId: assignee._id,
            projectId: project._id,
            type: "TASK_APPROACHING",
            title,
            message: `The task "${wi.title}" for project "${project.title || project.clientDetails?.companyName}" is due in ${reminderDaysBefore} day(s).`,
          });
          notificationsCreated++;
        }

        const mailRes = await sendDeadlineReminderEmail({
          task: wi,
          assignee,
          projectManager: pmUser,
          project,
          reminderType: "approaching",
          days: reminderDaysBefore,
        });
        if (mailRes.success) emailsDispatched++;

        wi.lastReminderSentAt = now;
        wi.lastReminderType = "approaching";
        await wi.save();
      }

      // Case B: Day of Deadline
      else if (diffDays === 0 && sendOnDueDate && (wi.lastReminderType !== "due_today" || hoursSinceLastSent >= 24)) {
        const title = `Task Due Today: "${wi.title}"`;
        if (!(await alreadyNotified(assignee._id.toString(), project._id.toString(), title))) {
          await Notification.create({
            recipientId: assignee._id,
            projectId: project._id,
            type: "TASK_APPROACHING",
            title,
            message: `The task "${wi.title}" for project "${project.title || project.clientDetails?.companyName}" is due today!`,
          });
          notificationsCreated++;
        }

        const mailRes = await sendDeadlineReminderEmail({
          task: wi,
          assignee,
          projectManager: pmUser,
          project,
          reminderType: "due_today",
        });
        if (mailRes.success) emailsDispatched++;

        wi.lastReminderSentAt = now;
        wi.lastReminderType = "due_today";
        await wi.save();
      }

      // Case C: Overdue (recur every overdueInterval days)
      else if (diffDays < 0) {
        const daysOverdue = Math.abs(diffDays);
        const isRecurrenceDue = daysOverdue >= overdueInterval && daysOverdue % overdueInterval === 0;

        if (isRecurrenceDue && hoursSinceLastSent >= 24) {
          const title = `Task Overdue: "${wi.title}"`;
          if (!(await alreadyNotified(assignee._id.toString(), project._id.toString(), title))) {
            await Notification.create({
              recipientId: assignee._id,
              projectId: project._id,
              type: "TASK_OVERDUE",
              title,
              message: `The task "${wi.title}" for project "${project.title || project.clientDetails?.companyName}" is overdue by ${daysOverdue} days.`,
            });
            notificationsCreated++;
          }

          const mailRes = await sendDeadlineReminderEmail({
            task: wi,
            assignee,
            projectManager: pmUser,
            project,
            reminderType: "overdue",
            days: daysOverdue,
          });
          if (mailRes.success) emailsDispatched++;

          wi.lastReminderSentAt = now;
          wi.lastReminderType = "overdue";
          wi.overdueReminderCount = (wi.overdueReminderCount || 0) + 1;
          await wi.save();
        }
      }
    }

    // 2. Overdue Legacy Tasks
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
          message: `The task "${task.title}" for project "${project.title || project.clientDetails?.companyName}" is overdue. Please complete it as soon as possible.`,
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

      const ownerRecipient = blocker.ownerId.toString();
      if (!(await alreadyNotified(ownerRecipient, project._id.toString(), title))) {
        await Notification.create({
          recipientId: blocker.ownerId,
          projectId: project._id,
          type: "BLOCKER_OVERDUE",
          title,
          message: `You are the owner of an open blocker "${blocker.title}" on project "${project.title || project.clientDetails?.companyName}" that is overdue.`,
        });
        notificationsCreated++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Completed reminder checks. Generated ${notificationsCreated} new notifications, sent ${emailsDispatched} emails.`,
      stats: {
        notificationsCreated,
        emailsDispatched,
      },
    });
  } catch (error: any) {
    console.error("Cron check error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
