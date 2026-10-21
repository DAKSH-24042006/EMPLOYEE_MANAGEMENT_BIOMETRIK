import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { ProjectActivity } from "@/lib/models/ProjectActivity";
import { Project } from "@/lib/models/Project";
import { User } from "@/lib/models/User";
import { verifyJwt } from "@/lib/auth";
import { Role } from "@/lib/constants";
import { canUserViewProject } from "@/lib/projectAccess";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // STRICT CHECK: Activity logs are strictly visible only to the Project Manager and System Administrators
    const project = await Project.findById(id).select("techOwner");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isSystemAdmin = payload.role === Role.SYSTEM_ADMIN || payload.role === "ADMIN";
    const isProjectManager =
      isSystemAdmin || (project.techOwner && String(project.techOwner) === String(payload.userId));

    if (!isProjectManager) {
      return NextResponse.json(
        {
          error:
            "Forbidden: Activity logs are visible only to the Project Manager and System Administrators.",
        },
        { status: 403 }
      );
    }

    const activities = await ProjectActivity.find({ projectId: id })
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({ data: activities }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Activities Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
