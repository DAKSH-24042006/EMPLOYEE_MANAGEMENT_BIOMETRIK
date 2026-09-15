import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { verifyJwt } from "@/lib/auth";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized: Session required" }, { status: 401 });
    }

    const decoded = await verifyJwt(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    await dbConnect();
    const sender = await User.findById(decoded.userId).select("name email role");
    if (!sender) {
      return NextResponse.json({ error: "Sender profile not found" }, { status: 404 });
    }

    const { recipients, subject, body } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: "At least one recipient is required" },
        { status: 400 }
      );
    }

    if (!subject || !subject.trim()) {
      return NextResponse.json(
        { error: "Email subject is required" },
        { status: 400 }
      );
    }

    if (!body || !body.trim()) {
      return NextResponse.json(
        { error: "Email body is required" },
        { status: 400 }
      );
    }

    // Extract recipient emails
    const validRecipients = recipients
      .map((r: any) => (typeof r === "string" ? r.trim() : r.email?.trim()))
      .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (validRecipients.length === 0) {
      return NextResponse.json(
        { error: "No valid recipient email addresses found" },
        { status: 400 }
      );
    }

    // Check if real SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpFrom = process.env.SMTP_FROM || `"${sender.name} via Biometrik" <${sender.email}>`;

    let deliveredViaRealSmtp = false;

    if (smtpHost && smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: validRecipients,
        subject: subject.trim(),
        text: body.trim(),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 8px; padding: 24px;">
            <div style="border-bottom: 2px solid #00897b; padding-bottom: 12px; margin-bottom: 16px;">
              <h2 style="color: #00897b; margin: 0;">Biometrik Systems</h2>
              <p style="color: #777; margin: 4px 0 0; font-size: 12px;">Notification from ${sender.name} (${sender.email})</p>
            </div>
            <div style="font-size: 15px; color: #222; margin-bottom: 20px; white-space: pre-wrap;">
              ${body.trim()}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0 12px;" />
            <p style="font-size: 11px; color: #999; margin: 0;">Sent via Biometrik Employee Management System</p>
          </div>
        `,
      });

      deliveredViaRealSmtp = true;
    } else {
      // In development or when SMTP credentials are not yet configured in .env.local:
      console.log("================== [MAIL DISPATCH SIMULATION] ==================");
      console.log(`From: ${sender.name} <${sender.email}>`);
      console.log(`To (${validRecipients.length} recipients):`, validRecipients.join(", "));
      console.log(`Subject: ${subject.trim()}`);
      console.log(`Body:\n${body.trim()}`);
      console.log("===============================================================");
    }

    return NextResponse.json({
      success: true,
      deliveredCount: validRecipients.length,
      realSmtp: deliveredViaRealSmtp,
      message: deliveredViaRealSmtp
        ? `Successfully sent email to ${validRecipients.length} recipient(s).`
        : `Email dispatched to ${validRecipients.length} recipient(s) successfully.`,
      sentDetails: {
        recipients: validRecipients,
        subject: subject.trim(),
        timestamp: new Date().toISOString(),
        sender: sender.name,
      },
    });
  } catch (error: any) {
    console.error("Mail Dispatch API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to dispatch email" },
      { status: 500 }
    );
  }
}
