import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ProjectAttachment } from "@/lib/models/ProjectAttachment";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { canUserViewProject } from "@/lib/projectAccess";

export const dynamic = "force-dynamic";

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
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access denied to this project" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";

    // Handle Folder Creation (JSON payload)
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.action === "create_folder") {
        const folderName = (body.folderName || "").trim();
        const parentFolder = (body.folder || body.parentFolder || "/").trim();

        if (!folderName) {
          return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
        }

        // Check for duplicate folder in the same parent folder
        const existingFolder = await ProjectAttachment.findOne({
          projectId: id,
          folder: parentFolder,
          originalName: folderName,
          isFolder: true,
        });

        if (existingFolder) {
          return NextResponse.json({ error: `Folder '${folderName}' already exists here.` }, { status: 400 });
        }

        const newFolder = await ProjectAttachment.create({
          projectId: id,
          filename: `folder_${folderName}`,
          originalName: folderName,
          folder: parentFolder,
          isFolder: true,
          mimeType: "application/x-directory",
          size: 0,
          uploadedBy: payload.userId,
        });

        const populatedFolder = await ProjectAttachment.findById(newFolder._id)
          .populate("uploadedBy", "name email role");

        return NextResponse.json(
          { data: populatedFolder },
          {
            status: 201,
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
          }
        );
      }
    }

    // Handle File Upload (FormData payload)
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const targetFolder = (formData.get("folder") as string) || "/";

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
      "application/zip",
      "application/x-zip-compressed",
      "application/json",
    ];

    if (!allowedMimeTypes.includes(file.type) && !file.type.startsWith("image/") && !file.type.startsWith("text/")) {
      return NextResponse.json({ error: "Unsupported file format. Please upload documents, images, spreadsheets, or PDFs." }, { status: 400 });
    }

    // 25MB max size
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File size exceeds limit (25MB)" }, { status: 400 });
    }

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
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      folder: targetFolder,
      isFolder: false,
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

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access denied to this project" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const folderParam = searchParams.get("folder");
    const folderFilter = folderParam !== null ? folderParam.trim() : "/";

    const query: any = { projectId: id, folder: folderFilter };

    const attachments = await ProjectAttachment.find(query)
      .populate("uploadedBy", "name email role")
      .sort({ isFolder: -1, createdAt: -1 });

    return NextResponse.json(
      { data: attachments },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
