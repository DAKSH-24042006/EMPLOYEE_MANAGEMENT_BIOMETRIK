import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";
import dbConnect from "@/lib/db";
import { EmailConfig, IEmailConfig } from "@/lib/models/EmailConfig";
import dayjs from "dayjs";

/**
 * Resolve base application URL for deep linking
 */
export function getBaseAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

/**
 * Return inline attachment for Biometrik Systems logo (CID: biometrik-logo)
 */
export function getLogoAttachment(): Array<{ filename: string; path: string; cid: string }> {
  try {
    const logoPath = path.join(process.cwd(), "public", "Biometrik_New_Logo.png");
    if (fs.existsSync(logoPath)) {
      return [
        {
          filename: "Biometrik_New_Logo.png",
          path: logoPath,
          cid: "biometrik-logo",
        },
      ];
    }
  } catch (err) {
    console.warn("[Mailer] Could not resolve logo attachment:", err);
  }
  return [];
}

/**
 * Build rich, responsive HTML email template with direct CTA and embedded logo signature
 */
export function buildEmailHtml({
  subject,
  bodyText,
  taskUrl,
  ctaText = "Open Task in Workspace",
}: {
  subject: string;
  bodyText: string;
  taskUrl?: string;
  ctaText?: string;
}): string {
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // Clean any remaining legacy text
  let cleanText = bodyText
    .replace(/Biometrik Systems Delivery Team/gi, "")
    .trim();

  // If taskUrl exists in the plain text, replace its literal text with styled hyperlink
  if (taskUrl) {
    const escapedUrl = escapeHtml(taskUrl);
    cleanText = cleanText.split(taskUrl).join(`<a href="${escapedUrl}" style="color: #00897b; font-weight: 600; text-decoration: underline; word-break: break-all;">${escapedUrl}</a>`);
  }

  // Convert paragraphs and line breaks
  const paragraphs = cleanText
    .split(/\n\n+/)
    .map((p) => {
      const htmlPara = p
        .split("\n")
        .map((line) => {
          if (line.includes("<a href=")) return line;
          return escapeHtml(line);
        })
        .join("<br />");
      return `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155; font-size: 14px;">${htmlPara}</p>`;
    })
    .join("");

  // Optional direct CTA button
  const ctaButtonHtml = taskUrl
    ? `
      <div style="margin: 24px 0 28px 0; text-align: left;">
        <a href="${escapeHtml(taskUrl)}" target="_blank" style="display: inline-block; background-color: #00897b; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none; box-shadow: 0 2px 4px rgba(0, 137, 123, 0.25);">
          ${escapeHtml(ctaText)} &rarr;
        </a>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
          <!-- Top Brand Header -->
          <tr>
            <td style="background-color: #00897b; padding: 20px 32px; border-bottom: 2px solid #00695c;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">
                      Biometrik Systems
                    </span>
                  </td>
                  <td align="right">
                    <span style="color: #e0f2f1; font-size: 12px; font-weight: 500;">
                      Task Notification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${paragraphs}

              ${ctaButtonHtml}

              <!-- Signature with Logo -->
              <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
                <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">
                  Best regards,
                </div>
                <div>
                  <img src="cid:biometrik-logo" alt="Biometrik Systems" style="height: 38px; width: auto; max-width: 180px; display: block; border: 0;" />
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td style="background-color: #f8fafc; padding: 16px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                This is an automated system notification from Biometrik Systems Workspace.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Replace placeholders like {{taskTitle}}, {{assigneeName}}, {{taskUrl}} in text
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  if (!template) return "";
  let rendered = template;
  for (const [key, val] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    rendered = rendered.replace(regex, val !== undefined && val !== null ? String(val) : "");
  }
  return rendered;
}

/**
 * Retrieve active EmailConfig from DB, or fallback to sensible defaults and ENV
 * Migrates existing legacy templates to include direct task URLs and removes legacy text.
 */
export async function getEmailConfig(): Promise<any> {
  await dbConnect();
  let config = await EmailConfig.findOne().sort({ createdAt: -1 });

  if (!config) {
    // Create initial default configuration in DB
    config = await EmailConfig.create({
      smtpHost: process.env.SMTP_HOST || "",
      smtpPort: Number(process.env.SMTP_PORT) || 587,
      smtpSecure: process.env.SMTP_SECURE === "true",
      smtpUser: process.env.SMTP_USER || "",
      smtpPass: process.env.SMTP_PASS || "",
      fromEmail: process.env.SMTP_FROM || "notifications@biometriksystems.com",
      fromName: process.env.SMTP_FROM_NAME || "Biometrik Systems Notifications",
      isEnabled: true,
      reminderDaysBeforeDue: 1,
      sendOnDueDate: true,
      overdueIntervalDays: 2,
    });
  } else if (config.templates) {
    // Automatic migration for existing DB configurations to ensure {{taskUrl}} and remove legacy text
    let needsSave = false;
    const templateKeys = ["taskCreated", "deadlineApproaching", "deadlineToday", "taskOverdue"] as const;

    for (const key of templateKeys) {
      if (config.templates[key]?.body) {
        let body = config.templates[key].body;
        let modified = false;

        // Replace old dashboard prompt with direct workspace link instruction
        if (body.includes("Please log in to your dashboard to review the task details and update your progress.")) {
          body = body.replace(
            /Please log in to your dashboard to review the task details and update your progress\./g,
            "Review the task details and update your progress directly in the workspace:\n{{taskUrl}}"
          );
          modified = true;
        }

        // Remove legacy Delivery Team text
        if (body.includes("Biometrik Systems Delivery Team")) {
          body = body.replace(/\n*Biometrik Systems Delivery Team/g, "");
          modified = true;
        }

        // Ensure {{taskUrl}} is present
        if (!body.includes("{{taskUrl}}")) {
          body = body.replace(
            /Best regards,/,
            "Review the task details and update your progress directly in the workspace:\n{{taskUrl}}\n\nBest regards,"
          );
          modified = true;
        }

        if (modified) {
          config.templates[key].body = body.trim();
          needsSave = true;
        }
      }
    }

    if (needsSave) {
      try {
        await config.save();
      } catch (saveErr) {
        console.warn("[Mailer] Could not auto-save migrated email templates:", saveErr);
      }
    }
  }

  return config;
}

/**
 * Create a Nodemailer transporter based on DB config or ENV variables
 */
export async function createTransporter(customConfig?: Partial<IEmailConfig>) {
  const config = customConfig || (await getEmailConfig());

  const host = config.smtpHost || process.env.SMTP_HOST;
  const port = Number(config.smtpPort || process.env.SMTP_PORT || 587);
  const secure = Boolean(config.smtpSecure ?? (process.env.SMTP_SECURE === "true"));
  const user = config.smtpUser || process.env.SMTP_USER;
  const pass = config.smtpPass || process.env.SMTP_PASS;

  if (!host || !user) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * 1. Task Created & Assigned Email (with Project Manager CC'd)
 */
export async function sendTaskAssignmentEmail({
  task,
  assignee,
  projectManager,
  project,
}: {
  task: any;
  assignee: any;
  projectManager?: any;
  project: any;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!assignee?.email) {
      return { success: false, error: "Assignee does not have a valid email." };
    }

    const config = await getEmailConfig();
    if (!config.isEnabled) {
      return { success: false, error: "Email notifications are disabled in settings." };
    }

    const transporter = await createTransporter(config);
    if (!transporter) {
      console.warn("[Mailer] SMTP credentials not configured. Skipping email dispatch.");
      return { success: false, error: "SMTP credentials not configured on server." };
    }

    const baseUrl = getBaseAppUrl();
    const taskUrl = `${baseUrl}/projects/${project._id}`;

    const data = {
      taskTitle: task.title,
      assigneeName: assignee.name || "Team Member",
      projectName: project.title || project.clientDetails?.companyName || "Client Project",
      dueDate: task.dueDate ? dayjs(task.dueDate).format("DD MMM YYYY") : "Not specified",
      priority: task.priority || "Medium",
      status: task.status || "Backlog",
      projectManagerName: projectManager?.name || "Project Manager",
      description: task.description || "No description provided.",
      taskUrl,
      projectUrl: taskUrl,
    };

    const template = config.templates?.taskCreated || {};
    const subject = renderTemplate(
      template.subject || "[Biometrik Systems] New Task Assigned: {{taskTitle}}",
      data
    );
    const bodyText = renderTemplate(
      template.body ||
        "Hello {{assigneeName}},\n\nA new task has been assigned to you in project \"{{projectName}}\".\n\nReview the task details and update your progress directly in the workspace:\n{{taskUrl}}\n\nBest regards,",
      data
    );

    const fromAddress = `"${config.fromName || "Biometrik Systems"}" <${config.fromEmail || config.smtpUser}>`;

    // CC the Project Manager if an email is present and not the assignee themselves
    const ccList: string[] = [];
    if (projectManager?.email && projectManager.email.toLowerCase() !== assignee.email.toLowerCase()) {
      ccList.push(projectManager.email);
    }

    const attachments = getLogoAttachment();
    const html = buildEmailHtml({
      subject,
      bodyText,
      taskUrl,
      ctaText: "Open Task in Workspace",
    });

    await transporter.sendMail({
      from: fromAddress,
      to: assignee.email,
      cc: ccList.length > 0 ? ccList : undefined,
      subject,
      text: bodyText,
      html,
      attachments,
    });

    console.log(`[Mailer] Task assignment email sent to ${assignee.email} (CC: ${ccList.join(", ") || "none"})`);
    return { success: true };
  } catch (err: any) {
    console.error("[Mailer] Error sending task assignment email:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 2. Deadline Reminder Emails (Approaching, Due Today, Overdue)
 */
export async function sendDeadlineReminderEmail({
  task,
  assignee,
  projectManager,
  project,
  reminderType,
  days,
}: {
  task: any;
  assignee: any;
  projectManager?: any;
  project: any;
  reminderType: "approaching" | "due_today" | "overdue";
  days?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!assignee?.email) {
      return { success: false, error: "Assignee does not have an email." };
    }

    const config = await getEmailConfig();
    if (!config.isEnabled) {
      return { success: false, error: "Email notifications are disabled." };
    }

    const transporter = await createTransporter(config);
    if (!transporter) {
      console.warn("[Mailer] SMTP credentials not configured. Skipping reminder email.");
      return { success: false, error: "SMTP credentials not configured." };
    }

    const baseUrl = getBaseAppUrl();
    const taskUrl = `${baseUrl}/projects/${project._id}`;

    const data = {
      taskTitle: task.title,
      assigneeName: assignee.name || "Team Member",
      projectName: project.title || project.clientDetails?.companyName || "Client Project",
      dueDate: task.dueDate ? dayjs(task.dueDate).format("DD MMM YYYY") : "Not specified",
      priority: task.priority || "Medium",
      status: task.status || "Pending",
      projectManagerName: projectManager?.name || "Project Manager",
      daysLeft: days !== undefined ? days : config.reminderDaysBeforeDue || 1,
      daysOverdue: days !== undefined ? days : 2,
      intervalDays: config.overdueIntervalDays || 2,
      taskUrl,
      projectUrl: taskUrl,
    };

    const template = config.templates?.[
      reminderType === "approaching"
        ? "deadlineApproaching"
        : reminderType === "due_today"
        ? "deadlineToday"
        : "taskOverdue"
    ];

    let defaultSubject = "";
    let defaultBody = "";

    if (reminderType === "approaching") {
      defaultSubject = "[Biometrik Systems Reminder] Only {{daysLeft}} day left for task: {{taskTitle}}";
      defaultBody = `Hello {{assigneeName}},\n\nYour task "{{taskTitle}}" in project "{{projectName}}" is due on {{dueDate}} (only {{daysLeft}} day remaining).\n\nPlease review your progress and update the task directly in the workspace:\n{{taskUrl}}\n\nBest regards,`;
    } else if (reminderType === "due_today") {
      defaultSubject = "[Biometrik Systems Urgent] Task Deadline Today: {{taskTitle}}";
      defaultBody = `Hello {{assigneeName}},\n\nThe deadline for your assigned task "{{taskTitle}}" in project "{{projectName}}" is TODAY ({{dueDate}}).\n\nPlease mark the task as Completed or post an update directly in the workspace:\n{{taskUrl}}\n\nBest regards,`;
    } else {
      defaultSubject = "[Biometrik Systems Action Required] Overdue Task Reminder: {{taskTitle}}";
      defaultBody = `Hello {{assigneeName}},\n\nYour task "{{taskTitle}}" in project "{{projectName}}" is currently OVERDUE by {{daysOverdue}} days (Due: {{dueDate}}).\n\nPlease open the task and address it immediately:\n{{taskUrl}}\n\nBest regards,`;
    }

    const subject = renderTemplate(template?.subject || defaultSubject, data);
    const bodyText = renderTemplate(template?.body || defaultBody, data);
    const fromAddress = `"${config.fromName || "Biometrik Systems"}" <${config.fromEmail || config.smtpUser}>`;

    const attachments = getLogoAttachment();
    const html = buildEmailHtml({
      subject,
      bodyText,
      taskUrl,
      ctaText: "Review Task in Workspace",
    });

    await transporter.sendMail({
      from: fromAddress,
      to: assignee.email,
      subject,
      text: bodyText,
      html,
      attachments,
    });

    console.log(`[Mailer] Reminder (${reminderType}) sent to ${assignee.email}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Mailer] Error sending ${reminderType} email:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * 3. Diagnostic Test Email
 */
export async function sendTestEmail({
  toEmail,
  customConfig,
}: {
  toEmail: string;
  customConfig?: Partial<IEmailConfig>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const config = customConfig || (await getEmailConfig());
    const transporter = await createTransporter(config);

    if (!transporter) {
      return { success: false, error: "Missing required SMTP host or username." };
    }

    // Verify connection first
    await transporter.verify();

    const baseUrl = getBaseAppUrl();
    const testUrl = `${baseUrl}/projects`;
    const testSubject = "[Biometrik Systems] Test Email Notification";
    const testBody = `Hello,\n\nThis is a test email sent from Biometrik Systems Dashboard.\n\nYour SMTP configuration is working correctly!\n\nYou can access your workspace here:\n${testUrl}\n\nBest regards,`;

    const fromAddress = `"${config.fromName || "Biometrik Systems"}" <${config.fromEmail || config.smtpUser}>`;
    const attachments = getLogoAttachment();
    const html = buildEmailHtml({
      subject: testSubject,
      bodyText: testBody,
      taskUrl: testUrl,
      ctaText: "Visit Workspace Dashboard",
    });

    await transporter.sendMail({
      from: fromAddress,
      to: toEmail,
      subject: testSubject,
      text: testBody,
      html,
      attachments,
    });

    return { success: true };
  } catch (err: any) {
    console.error("[Mailer] Test email failed:", err);
    return { success: false, error: err.message };
  }
}

