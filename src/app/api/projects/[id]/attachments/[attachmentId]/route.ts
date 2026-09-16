import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ProjectAttachment } from "@/lib/models/ProjectAttachment";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { canUserViewProject } from "@/lib/projectAccess";
import fs from "fs";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
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

    const { id, attachmentId } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access restricted to project members" }, { status: 403 });
    }

    const attachment = await ProjectAttachment.findById(attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    if (attachment.isFolder) {
      return NextResponse.json({ error: "Cannot download a folder directly" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "uploads", attachment.filename || "");

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    // Read file as buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Return the file with proper headers to download/preview
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          attachment.originalName || "download"
        )}"`,
        "Content-Type": attachment.mimeType || "application/octet-stream",
      },
    });
  } catch (error: any) {
    console.error("Download attachment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
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

    const { id, attachmentId } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access restricted to project members" }, { status: 403 });
    }

    const attachment = await ProjectAttachment.findById(attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    // If it's a folder, delete all child files and subfolders
    if (attachment.isFolder) {
      const parentPath = attachment.folder === "/" ? "" : attachment.folder;
      const folderPrefix = `${parentPath}/${attachment.originalName}`;

      // Find all nested items to delete disk files
      const children = await ProjectAttachment.find({
        projectId: id,
        folder: { $regex: `^${folderPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
      });

      for (const child of children) {
        if (!child.isFolder && child.filename) {
          const childFilePath = path.join(process.cwd(), "uploads", child.filename);
          if (fs.existsSync(childFilePath)) {
            try { fs.unlinkSync(childFilePath); } catch (e) {}
          }
        }
      }

      await ProjectAttachment.deleteMany({
        projectId: id,
        folder: { $regex: `^${folderPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}` },
      });
    }

    // Remove from disk if file
    if (!attachment.isFolder && attachment.filename) {
      const filePath = path.join(process.cwd(), "uploads", attachment.filename);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    // Delete database entry
    await ProjectAttachment.findByIdAndDelete(attachmentId);

    return NextResponse.json({ message: "Item deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete attachment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
