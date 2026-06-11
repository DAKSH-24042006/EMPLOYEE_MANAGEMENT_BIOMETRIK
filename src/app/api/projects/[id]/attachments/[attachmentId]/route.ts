import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ProjectAttachment } from "@/lib/models/ProjectAttachment";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
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

    const { attachmentId } = await params;
    await dbConnect();

    const attachment = await ProjectAttachment.findById(attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "uploads", attachment.filename);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
    }

    // Read file as stream or buffer
    const fileBuffer = fs.readFileSync(filePath);

    // Return the file with proper headers to download/preview
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          attachment.originalName
        )}"`,
        "Content-Type": attachment.mimeType,
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

    const { attachmentId } = await params;
    await dbConnect();

    const attachment = await ProjectAttachment.findById(attachmentId);
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }

    const filePath = path.join(process.cwd(), "uploads", attachment.filename);

    // Remove from disk
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database entry
    await ProjectAttachment.findByIdAndDelete(attachmentId);

    return NextResponse.json({ message: "Attachment deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete attachment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
