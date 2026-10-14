import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ProjectAttachment } from "@/lib/models/ProjectAttachment";
import { Project } from "@/lib/models/Project";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { canUserViewProject } from "@/lib/projectAccess";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json(
        { error: "Forbidden: Access denied to this project" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get("ids");
    const folderParam = searchParams.get("folder");

    const query: any = { projectId: id, isFolder: false };

    if (idsParam) {
      const idList = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (idList.length > 0) {
        query._id = { $in: idList };
      }
    } else if (folderParam && folderParam !== "ALL") {
      query.folder = folderParam;
    }

    const attachments = await ProjectAttachment.find(query);
    if (!attachments || attachments.length === 0) {
      return NextResponse.json({ error: "No files found to download" }, { status: 404 });
    }

    const project = await Project.findById(id).select("title");
    const zip = new JSZip();

    // Track used names to avoid collisions in the zip
    const nameCountMap: Record<string, number> = {};

    for (const att of attachments) {
      const filePath = path.join(process.cwd(), "uploads", att.filename || "");
      if (fs.existsSync(filePath)) {
        let entryName = att.originalName || "document";
        if (nameCountMap[entryName]) {
          const ext = path.extname(entryName);
          const base = path.basename(entryName, ext);
          entryName = `${base} (${nameCountMap[entryName]})${ext}`;
          nameCountMap[att.originalName]++;
        } else {
          nameCountMap[entryName] = 1;
        }

        const fileData = fs.readFileSync(filePath);
        zip.file(entryName, fileData);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const safeProjectName = (project?.title || "project_files").replace(/[^a-zA-Z0-9_\-]/g, "_");

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeProjectName}_files.zip"`,
      },
    });
  } catch (error: any) {
    console.error("Bulk download error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate zip archive" },
      { status: 500 }
    );
  }
}
