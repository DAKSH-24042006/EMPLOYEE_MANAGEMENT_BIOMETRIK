import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { EmailConfig } from "@/lib/models/EmailConfig";
import { Role } from "@/lib/constants";
import { verifyJwt } from "@/lib/auth";
import { sendTestEmail, getEmailConfig } from "@/lib/mailer";

export const dynamic = "force-dynamic";

async function verifyAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  if (!payload?.userId) return null;
  if (payload.role !== Role.SYSTEM_ADMIN && payload.role !== "ADMIN") return null;
  return payload;
}

export async function GET() {
  try {
    const admin = await verifyAdminAuth();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    await dbConnect();
    const config = await getEmailConfig();

    return NextResponse.json({
      success: true,
      data: {
        smtpHost: config.smtpHost || "",
        smtpPort: config.smtpPort || 587,
        smtpSecure: Boolean(config.smtpSecure),
        smtpUser: config.smtpUser || "",
        smtpPass: config.smtpPass ? "••••••••" : "",
        hasPassword: Boolean(config.smtpPass),
        fromEmail: config.fromEmail || "",
        fromName: config.fromName || "",
        isEnabled: Boolean(config.isEnabled),
        reminderDaysBeforeDue: config.reminderDaysBeforeDue ?? 1,
        sendOnDueDate: config.sendOnDueDate ?? true,
        overdueIntervalDays: config.overdueIntervalDays ?? 2,
        templates: config.templates,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("GET Email Settings Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await verifyAdminAuth();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    await dbConnect();

    let config = await EmailConfig.findOne().sort({ createdAt: -1 });
    if (!config) {
      config = new EmailConfig();
    }

    if (body.smtpHost !== undefined) config.smtpHost = body.smtpHost;
    if (body.smtpPort !== undefined) config.smtpPort = Number(body.smtpPort) || 587;
    if (body.smtpSecure !== undefined) config.smtpSecure = Boolean(body.smtpSecure);
    if (body.smtpUser !== undefined) config.smtpUser = body.smtpUser;
    if (body.smtpPass && body.smtpPass !== "••••••••") config.smtpPass = body.smtpPass;
    if (body.fromEmail !== undefined) config.fromEmail = body.fromEmail;
    if (body.fromName !== undefined) config.fromName = body.fromName;
    if (body.isEnabled !== undefined) config.isEnabled = Boolean(body.isEnabled);

    // Cadence / numbers
    if (body.reminderDaysBeforeDue !== undefined) config.reminderDaysBeforeDue = Math.max(1, Number(body.reminderDaysBeforeDue) || 1);
    if (body.sendOnDueDate !== undefined) config.sendOnDueDate = Boolean(body.sendOnDueDate);
    if (body.overdueIntervalDays !== undefined) config.overdueIntervalDays = Math.max(1, Number(body.overdueIntervalDays) || 2);

    // Templates
    if (body.templates) {
      config.templates = {
        ...config.templates,
        ...body.templates,
      };
    }

    config.updatedBy = admin.userId as any;
    await config.save();

    return NextResponse.json({
      success: true,
      message: "Email and notification settings updated successfully",
      data: {
        smtpHost: config.smtpHost,
        smtpPort: config.smtpPort,
        smtpSecure: config.smtpSecure,
        smtpUser: config.smtpUser,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        isEnabled: config.isEnabled,
        reminderDaysBeforeDue: config.reminderDaysBeforeDue,
        sendOnDueDate: config.sendOnDueDate,
        overdueIntervalDays: config.overdueIntervalDays,
        templates: config.templates,
      },
    });
  } catch (error: any) {
    console.error("PUT Email Settings Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// POST to test email delivery
export async function POST(req: Request) {
  try {
    const admin = await verifyAdminAuth();
    if (!admin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const { testEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass, fromEmail, fromName } = body;

    if (!testEmail) {
      return NextResponse.json({ error: "Test recipient email is required" }, { status: 400 });
    }

    await dbConnect();
    const currentConfig = await getEmailConfig();

    const testConfig: any = {
      smtpHost: smtpHost || currentConfig.smtpHost,
      smtpPort: smtpPort || currentConfig.smtpPort,
      smtpSecure: smtpSecure !== undefined ? smtpSecure : currentConfig.smtpSecure,
      smtpUser: smtpUser || currentConfig.smtpUser,
      smtpPass: smtpPass && smtpPass !== "••••••••" ? smtpPass : currentConfig.smtpPass,
      fromEmail: fromEmail || currentConfig.fromEmail,
      fromName: fromName || currentConfig.fromName,
    };

    const result = await sendTestEmail({
      toEmail: testEmail,
      customConfig: testConfig,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to send test email" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Test email dispatched successfully to ${testEmail}` });
  } catch (error: any) {
    console.error("POST Test Email Error:", error);
    return NextResponse.json({ error: error.message || "Failed to send test email" }, { status: 500 });
  }
}
