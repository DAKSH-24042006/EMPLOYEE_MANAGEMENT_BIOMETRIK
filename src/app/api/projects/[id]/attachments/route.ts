import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ProjectAttachment } from "@/lib/models/ProjectAttachment";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validation
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
      "text/csv",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Forbidden file type!" }, { status: 400 });
    }

    // 10MB max size
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds limit (10MB)" }, { status: 400 });
    }

    await dbConnect();

    // Setup Storage Path
    const uploadDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize and generate unique safe filename
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const uniqueFilename = `${crypto.randomUUID()}_${sanitizedOriginalName}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Save File
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    // Create Database Entry
    const attachment = await ProjectAttachment.create({
      projectId: id,
      filename: uniqueFilename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedBy: payload.userId,
    });

    const populatedAttachment = await ProjectAttachment.findById(attachment._id)
      .populate("uploadedBy", "name email role");

    return NextResponse.json({ data: populatedAttachment }, { status: 201 });
  } catch (error: any) {
    console.error("Attachment upload error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

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

    const attachments = await ProjectAttachment.find({ projectId: id })
      .populate("uploadedBy", "name email role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ data: attachments }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
