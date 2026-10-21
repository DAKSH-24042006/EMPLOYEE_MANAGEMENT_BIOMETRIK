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
  notificationType = "task",
  meta = {},
}: {
  subject: string;
  bodyText: string;
  taskUrl?: string;
  ctaText?: string;
  /** "task" | "reminder" | "overdue" | "test" | "bug" */
  notificationType?: "task" | "reminder" | "overdue" | "test" | "bug";
  /** Optional structured metadata shown as a detail card: { label: value } */
  meta?: Record<string, string>;
}): string {
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // ─── Badge & accent colours per notification type ───────────────────────────
  const typeConfig: Record<
    string,
    { label: string; badgeBg: string; badgeColor: string; accentColor: string; iconChar: string }
  > = {
    task: {
      label: "kramik",
      badgeBg: "#0369a1",
      badgeColor: "#ffffff",
      accentColor: "#0284c7",
      iconChar: "📋",
    },
    reminder: {
      label: "Deadline Reminder",
      badgeBg: "#b45309",
      badgeColor: "#ffffff",
      accentColor: "#d97706",
      iconChar: "⏰",
    },
    overdue: {
      label: "Overdue Alert",
      badgeBg: "#b91c1c",
      badgeColor: "#ffffff",
      accentColor: "#dc2626",
      iconChar: "🚨",
    },
    bug: {
      label: "Bug Defect Alert",
      badgeBg: "#be123c",
      badgeColor: "#ffffff",
      accentColor: "#e11d48",
      iconChar: "🐛",
    },
    test: {
      label: "Test Notification",
      badgeBg: "#00796b",
      badgeColor: "#ffffff",
      accentColor: "#00897b",
      iconChar: "🔧",
    },
  };
  const tc = typeConfig[notificationType] || typeConfig.task;

  // ─── Strip legacy text & clean body ────────────────────────────────────────
  let cleanText = bodyText
    .replace(/Biometrik Systems Delivery Team/gi, "")
    .replace(/Your SMTP configuration is working correctly!/gi, "")
    .trim();

  // Replace raw task URLs with hyperlinks
  if (taskUrl) {
    const escapedUrl = escapeHtml(taskUrl);
    cleanText = cleanText
      .split(taskUrl)
      .join(
        `<a href="${escapedUrl}" style="color: #00897b; font-weight: 600; text-decoration: underline; word-break: break-all;">${escapedUrl}</a>`
      );
  }

  // ─── Render body paragraphs ─────────────────────────────────────────────────
  const lines = cleanText.split("\n");
  let inDetailBlock = false;
  let detailRowsHtml = "";
  let bodyPartsHtml = "";

  const flushDetailBlock = () => {
    if (!detailRowsHtml) return;
    bodyPartsHtml += `
      <table width="100%" border="0" cellspacing="0" cellpadding="0"
             style="margin: 0 0 20px 0; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; border-collapse: separate; border-spacing: 0;">
        ${detailRowsHtml}
      </table>`;
    detailRowsHtml = "";
    inDetailBlock = false;
  };

  let pendingParagraph: string[] = [];
  const flushParagraph = () => {
    if (!pendingParagraph.length) return;
    const joined = pendingParagraph.join("<br />");
    bodyPartsHtml += `<p style="margin: 0 0 16px 0; line-height: 1.65; color: #1e293b; font-size: 15px; font-family: Arial, Helvetica, sans-serif;">${joined}</p>`;
    pendingParagraph = [];
  };

  let rowIndex = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();

    // Detect a "- Label: Value" detail row
    const detailMatch = line.match(/^-\s+(.+?):\s*(.*)$/);
    if (detailMatch) {
      flushParagraph();
      inDetailBlock = true;
      const label = escapeHtml(detailMatch[1].trim());
      const value = escapeHtml(detailMatch[2].trim());
      const rowBg = rowIndex % 2 === 0 ? "#ffffff" : "#f8fafc";
      rowIndex++;
      detailRowsHtml += `
        <tr>
          <td style="padding: 11px 16px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; width: 36%; font-family: Arial, Helvetica, sans-serif;">
            ${label}
          </td>
          <td style="padding: 11px 16px; font-size: 14px; color: #0f172a; background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">
            ${value || "<span style='color:#94a3b8;font-style:italic;'>—</span>"}
          </td>
        </tr>`;
    } else {
      if (inDetailBlock) flushDetailBlock();

      if (line === "" || line === "Best regards,") {
        flushParagraph();
      } else if (line.includes("<a href=")) {
        pendingParagraph.push(line);
      } else {
        pendingParagraph.push(escapeHtml(line));
      }
    }
  }
  flushParagraph();
  if (inDetailBlock) flushDetailBlock();

  // ─── Structured meta card (optional, passed from caller) ───────────────────
  let metaCardHtml = "";
  const metaEntries = Object.entries(meta || {});
  if (metaEntries.length > 0) {
    let metaRows = "";
    metaEntries.forEach(([label, value], i) => {
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      metaRows += `
        <tr>
          <td style="padding: 11px 16px; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; background-color: ${bg}; border-bottom: 1px solid #e2e8f0; width: 36%; font-family: Arial, Helvetica, sans-serif;">
            ${escapeHtml(label)}
          </td>
          <td style="padding: 11px 16px; font-size: 14px; color: #0f172a; background-color: ${bg}; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">
            ${escapeHtml(value)}
          </td>
        </tr>`;
    });
    metaCardHtml = `
      <table width="100%" border="0" cellspacing="0" cellpadding="0"
             style="margin: 0 0 24px 0; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; border-collapse: separate; border-spacing: 0;">
        ${metaRows}
      </table>`;
  }

  // ─── Bulletproof CTA Button for Email Clients (Outlook compatible) ─────────
  const ctaHtml = taskUrl
    ? `
    <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
      <tr>
        <td align="left" bgcolor="#00897b" style="border-radius: 6px; background-color: #00897b;">
          <a href="${escapeHtml(taskUrl)}" target="_blank"
             style="display: inline-block; padding: 14px 28px; background-color: #00897b; color: #ffffff !important; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 6px; border: 1px solid #00796b;">
            ${escapeHtml(ctaText)} &nbsp;&rarr;
          </a>
        </td>
      </tr>
    </table>`
    : "";

  // ─── Full HTML Layout ────────────────────────────────────────────────────────
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Outer Wrapper -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;background-color:#ffffff;border:1px solid #cbd5e1;border-radius:8px;overflow:hidden;">

          <!-- ── Header ───────────────────────────────────────────────────── -->
          <tr>
            <td bgcolor="#004d40" style="background-color:#004d40;padding:24px 32px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Brand Title -->
                    <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;font-family:Arial,Helvetica,sans-serif;">
                      BIOMETRIK<span style="color:#80cbc4;">®</span>
                    </span>
                    <br />
                    <span style="color:#b2dfdb;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                      ACCESS GRANTED.
                    </span>
                  </td>
                  <td align="right" valign="middle">
                    <!-- Notification Badge -->
                    <span style="display:inline-block;background-color:${tc.badgeBg};color:${tc.badgeColor};font-size:11px;font-weight:bold;letter-spacing:0.5px;padding:6px 14px;border-radius:16px;font-family:Arial,Helvetica,sans-serif;">
                      ${tc.iconChar}&nbsp; ${tc.label}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Accent Bar ────────────────────────────────────────────────── -->
          <tr>
            <td bgcolor="${tc.accentColor}" style="background-color:${tc.accentColor};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
          </tr>

          <!-- ── Main Card Content ─────────────────────────────────────────── -->
          <tr>
            <td style="padding:32px 32px 24px 32px;background-color:#ffffff;">

              <!-- Subject / Title -->
              <h1 style="margin:0 0 20px 0;font-size:19px;font-weight:bold;color:#0f172a;line-height:1.4;font-family:Arial,Helvetica,sans-serif;">
                ${escapeHtml(subject)}
              </h1>

              <!-- Divider -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 24px 0;" />

              <!-- Body Paragraphs -->
              ${bodyPartsHtml}

              <!-- Optional Meta Card -->
              ${metaCardHtml}

              <!-- CTA Button -->
              ${ctaHtml}

            </td>
          </tr>

          <!-- ── Signature Strip ───────────────────────────────────────────── -->
          <tr>
            <td bgcolor="#f8fafc" style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="middle">
                    <p style="margin:0 0 2px 0;font-size:12px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">Sent by</p>
                    <p style="margin:0;font-size:14px;font-weight:bold;color:#00897b;letter-spacing:0.3px;font-family:Arial,Helvetica,sans-serif;">
                      Biometrik Systems Workspace
                    </p>
                  </td>
                  <td align="right" valign="middle">
                    <img src="cid:biometrik-logo" alt="Biometrik Systems" style="height:36px;width:auto;max-width:150px;display:block;border:0;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Footer ───────────────────────────────────────────────────── -->
          <tr>
            <td bgcolor="#f1f5f9" style="background-color:#f1f5f9;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 4px 0;font-size:11px;color:#64748b;font-family:Arial,Helvetica,sans-serif;">
                © ${year} Biometrik Systems Pvt. Ltd. · All rights reserved.
              </p>
              <p style="margin:0;font-size:10px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">
                This is an automated system notification. If you have questions, contact your System Administrator.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`.trim();
}

/**
 * Replace placeholders like {{taskTitle}}, {{assigneeName}}, {{taskUrl}} in text
 */
export function renderTemplate(template: string, data: Record<string, unknown>): string {
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
      // Read from EMAIL_* env vars (matching .env file convention)
      smtpHost: process.env.EMAIL_HOST || "",
      smtpPort: Number(process.env.EMAIL_PORT) || 587,
      smtpSecure: process.env.EMAIL_SECURE === "true",
      smtpUser: process.env.EMAIL_USER || "",
      smtpPass: process.env.EMAIL_PASS || "",
      fromEmail: process.env.EMAIL_FROM || "notifications@biometriksystems.com",
      fromName: process.env.EMAIL_FROM_NAME || "Biometrik Systems Notifications",
      isEnabled: true,
      reminderDaysBeforeDue: 1,
      sendOnDueDate: true,
      overdueIntervalDays: 2,
    });
  } else if (config.templates) {
    // Automatic migration for existing DB configurations to ensure {{taskUrl}} and remove legacy text
    let needsSave = false;
    const templateKeys = [
      "taskCreated",
      "deadlineApproaching",
      "deadlineToday",
      "taskOverdue",
    ] as const;

    for (const key of templateKeys) {
      if (config.templates[key]?.body) {
        let body = config.templates[key].body;
        let modified = false;

        // Replace old dashboard prompt with direct workspace link instruction
        if (
          body.includes(
            "Please log in to your dashboard to review the task details and update your progress."
          )
        ) {
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

  // Fallback chain: DB config → EMAIL_* env vars (matching .env convention)
  const host = config.smtpHost || process.env.EMAIL_HOST;
  const port = Number(config.smtpPort || process.env.EMAIL_PORT || 587);
  const secure = Boolean(config.smtpSecure ?? process.env.EMAIL_SECURE === "true");
  const user = config.smtpUser || process.env.EMAIL_USER;
  const pass = config.smtpPass || process.env.EMAIL_PASS;

  if (!host || !user) {
    console.warn("[Mailer] Missing SMTP host or user. Check EMAIL_HOST and EMAIL_USER in .env");
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
  assignedBy,
}: {
  task: any;

  assignee: any;

  projectManager?: any;

  project: any;
  assignedBy?: string;
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
    const taskUrl = `${baseUrl}/auth/login`;

    const data = {
      taskTitle: task.title,
      assigneeName: assignee.name || "Team Member",
      projectName: project.title || project.clientDetails?.companyName || "Client Project",
      dueDate: task.dueDate ? dayjs(task.dueDate).format("DD MMM YYYY") : "Not specified",
      priority: task.priority || "Medium",
      status: task.status || "Backlog",
      projectManagerName: projectManager?.name || "Project Manager",
      description: task.description || "No description provided.",
      assignedBy: assignedBy || "System Admin",
      taskUrl,
      projectUrl: taskUrl,
    };

    const template = config.templates?.taskCreated || {};
    const subject = renderTemplate(
      template.subject || "[kramik] New Task Assigned: {{taskTitle}}",
      data
    );
    const bodyText = renderTemplate(
      template.body ||
        'Hello {{assigneeName}},\n\nA new task has been assigned to you in project "{{projectName}}".\n\n- Project Name: {{projectName}}\n- Task Title: {{taskTitle}}\n- Task Description: {{description}}\n- Priority: {{priority}}\n- Due Date: {{dueDate}}\n- Assigned By: {{assignedBy}}\n\nReview the task details and update your progress directly in the workspace.\n\nBest regards,',
      data
    );

    const fromAddress = `"${config.fromName || "Biometrik Systems"}" <${config.fromEmail || config.smtpUser}>`;

    // CC the Project Manager if an email is present and not the assignee themselves
    const ccList: string[] = [];
    if (
      projectManager?.email &&
      projectManager.email.toLowerCase() !== assignee.email.toLowerCase()
    ) {
      ccList.push(projectManager.email);
    }

    const attachments = getLogoAttachment();
    const html = buildEmailHtml({
      subject,
      bodyText,
      taskUrl,
      ctaText: "Log in to Kramik Workspace",
      notificationType: "task",
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

    console.log(
      `[Mailer] Task assignment email sent to ${assignee.email} (CC: ${ccList.join(", ") || "none"})`
    );
    return { success: true };
  } catch (err: unknown) {
    console.error("[Mailer] Error sending task assignment email:", err);
    return { success: false, error: (err as Error).message };
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

    const template =
      config.templates?.[
        reminderType === "approaching"
          ? "deadlineApproaching"
          : reminderType === "due_today"
            ? "deadlineToday"
            : "taskOverdue"
      ];

    let defaultSubject = "";
    let defaultBody = "";

    if (reminderType === "approaching") {
      defaultSubject =
        "[Biometrik Systems Reminder] Only {{daysLeft}} day left for task: {{taskTitle}}";
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
      ctaText: reminderType === "overdue" ? "Address Overdue Task Now" : "Review Task in Workspace",
      notificationType:
        reminderType === "overdue"
          ? "overdue"
          : reminderType === "due_today"
            ? "reminder"
            : "reminder",
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
  } catch (err: unknown) {
    console.error(`[Mailer] Error sending ${reminderType} email:`, err);
    return { success: false, error: (err as Error).message };
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
    const testSubject = "Test Email Notification";

    const namePart = toEmail.split("@")[0];
    const capitalizedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const testBody = `Hello ${capitalizedName},\n\nYou can access your workspace here:\n${testUrl}\n\nBest regards,`;

    const fromAddress = `"${config.fromName || "Biometrik Systems"}" <${config.fromEmail || config.smtpUser}>`;
    const attachments = getLogoAttachment();
    const html = buildEmailHtml({
      subject: testSubject,
      bodyText: testBody,
      taskUrl: testUrl,
      ctaText: "Visit Workspace Dashboard",
      notificationType: "test",
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
  } catch (err: unknown) {
    console.error("[Mailer] Test email failed:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 4. Bug Tracking: Send Bug Reported Email to PM / Assignee
 */
export async function sendBugReportedEmail({
  toEmail,
  recipientName,
  bugId,
  title,
  severity,
  description,
  remarks,
  reportedByName,
  projectName,
  bugUrl,
}: {
  toEmail: string;
  recipientName: string;
  bugId: string;
  title: string;
  severity: string;
  description: string;
  remarks: string;
  reportedByName: string;
  projectName: string;
  bugUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getEmailConfig();
    if (!config.isEnabled) return { success: true };
    if (config.bugNotifications && config.bugNotifications.enabled === false)
      return { success: true };

    const rule = config.bugNotifications?.bugReported;
    if (rule && rule.enabled === false) return { success: true };

    const transporter = await createTransporter(config);
    if (!transporter) return { success: false, error: "SMTP not configured" };

    const recipients: string[] = [];
    if (rule ? rule.notifyAssignee !== false : true) {
      if (toEmail) recipients.push(toEmail);
    }
    if (rule?.customEmail) {
      recipients.push(...rule.customEmail.split(",").map((e: string) => e.trim()));
    }
    const validRecipients = Array.from(new Set(recipients.filter(Boolean)));
    if (validRecipients.length === 0) return { success: true };

    const data: Record<string, string> = {
      bugId,
      title,
      severity,
      description,
      remarks,
      reportedByName,
      projectName,
      recipientName,
      bugUrl: bugUrl || "",
    };

    const subject = rule?.template?.subject?.trim()
      ? renderTemplate(rule.template.subject, data)
      : `[Biometrik Defect ${bugId}] [${severity}] New Bug Reported in ${projectName}`;

    const bodyText = rule?.template?.body?.trim()
      ? renderTemplate(rule.template.body, data)
      : `Hello ${recipientName},\n\nA new defect ${bugId} has been reported in project "${projectName}" and assigned to you for triage.\n\nTitle: ${title}\nSeverity: ${severity}\nReported By: ${reportedByName}\n\nDescription:\n${description}\n\nReporter Remarks:\n${remarks}\n\nPlease review and assign a developer in the workspace:\n${bugUrl || ""}\n\nBest regards,`;

    const fromAddress = `"${config.fromName || "Biometrik Systems"}" <${config.fromEmail || config.smtpUser}>`;
    const attachments = getLogoAttachment();
    const html = buildEmailHtml({
      subject,
      bodyText,
      taskUrl: bugUrl,
      ctaText: "Review Bug in Workspace",
      notificationType: "bug",
      meta: {
        "Defect ID": bugId,
        Project: projectName,
        Severity: severity,
        "Reported By": reportedByName,
        "Initial Status": "OPEN",
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: validRecipients.join(", "),
      subject,
      text: bodyText,
      html,
      attachments,
    });
    return { success: true };
  } catch (err: unknown) {
    console.error("[Mailer] Bug reported email failed:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 5. Bug Tracking: Send Bug Assigned Email to Developer
 */
export async function sendBugAssignedEmail({
  toEmail,
  recipientName,
  bugId,
  title,
  severity,
  remarks,
  assignedByName,
  projectName,
  bugUrl,
}: {
  toEmail: string;
  recipientName: string;
  bugId: string;
  title: string;
  severity: string;
  remarks: string;
  assignedByName: string;
  projectName: string;
  bugUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const config = await getEmailConfig();
    if (!config.isEnabled) return { success: true };
    if (config.bugNotifications && config.bugNotifications.enabled === false)
      return { success: true };

    const rule = config.bugNotifications?.bugAssigned;
    if (rule && rule.enabled === false) return { success: true };

    const transporter = await createTransporter(config);
    if (!transporter) return { success: false, error: "SMTP not configured" };

    const recipients: string[] = [];
    if (rule ? rule.notifyAssignee !== false : true) {
      if (toEmail) recipients.push(toEmail);
    }
    if (rule?.customEmail) {
      recipients.push(...rule.customEmail.split(",").map((e: string) => e.trim()));
    }
    const validRecipients = Array.from(new Set(recipients.filter(Boolean)));
    if (validRecipients.length === 0) return { success: true };

    const data: Record<string, string> = {
      bugId,
      title,
      severity,
      remarks,
      assignedByName,
      projectName,
      recipientName,
      bugUrl: bugUrl || "",
    };

    const subject = rule?.template?.subject?.trim()
      ? renderTemplate(rule.template.subject, data)
      : `[Biometrik Defect ${bugId}] [${severity}] Bug Assigned to You: ${title}`;

    const bodyText = rule?.template?.body?.trim()
      ? renderTemplate(rule.template.body, data)
      : `Hello ${recipientName},\n\nYou have been assigned defect ${bugId} in project "${projectName}".\n\nTitle: ${title}\nSeverity: ${severity}\nAssigned By: ${assignedByName}\n\nAssignment Remarks:\n${remarks}\n\nPlease begin investigation and submit your fix in the workspace:\n${bugUrl || ""}\n\nBest regards,`;

    const fromAddress = `"${config.fromName || "Biometrik Systems"}" <${config.fromEmail || config.smtpUser}>`;
    const attachments = getLogoAttachment();
    const html = buildEmailHtml({
      subject,
      bodyText,
      taskUrl: bugUrl,
      ctaText: "Open Defect & Submit Fix",
      notificationType: "bug",
      meta: {
        "Defect ID": bugId,
        Project: projectName,
        Severity: severity,
        "Assigned By": assignedByName,
        Status: "ASSIGNED",
      },
    });

    await transporter.sendMail({
      from: fromAddress,
      to: validRecipients.join(", "),
      subject,
      text: bodyText,
      html,
      attachments,
    });
    return { success: true };
  } catch (err: unknown) {
    console.error("[Mailer] Bug assigned email failed:", err);
    return { success: false, error: (err as Error).message };
  }
}

/**
 * 6. Bug Tracking: Send Bug Reassigned Email to New Developer
 */
export async function sendBugReassignedEmail({
  toEmail,
  recipientName,
  bugId,
  title,
  severity,
  remarks,
  previousAssigneeName,
  reassignedByName,
  projectName,
  bugUrl,
}: {
  toEmail: string;
  recipientName: string;
  bugId: string;
  title: string;
  severity: string;
  remarks: string;
  previousAssigneeName?: string;
  reassignedByName: string;
  projectName: string;
  bugUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Disabled: Bug Reassigned notifications suppressed per system specification
  return { success: true };
}

/**
 * 7. Bug Tracking: Send Bug Fixed Email to PM and QA
 */
export async function sendBugFixedEmail({
  toEmails,
  bugId,
  title,
  severity,
  remarks,
  developerName,
  projectName,
  bugUrl,
}: {
  toEmails: string[];
  bugId: string;
  title: string;
  severity: string;
  remarks: string;
  developerName: string;
  projectName: string;
  bugUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Disabled: Fix Submitted for QA notifications suppressed per system specification
  return { success: true };
}

/**
 * 8. Bug Tracking: Send Bug QA Verified Email (PASS or FAIL)
 */
export async function sendBugQAVerifiedEmail({
  toEmails,
  bugId,
  title,
  severity,
  outcome,
  remarks,
  qaName,
  projectName,
  bugUrl,
}: {
  toEmails: string[];
  bugId: string;
  title: string;
  severity: string;
  outcome: "PASS" | "FAIL";
  remarks: string;
  qaName: string;
  projectName: string;
  bugUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Disabled: Bug QA Verified / Closed notifications suppressed per system specification
  return { success: true };
}
