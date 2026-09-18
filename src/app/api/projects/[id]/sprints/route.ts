import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { Sprint } from "@/lib/models/Sprint";
import { WorkItem } from "@/lib/models/WorkItem";
import { Project } from "@/lib/models/Project";
import { Role } from "@/lib/constants";
import { verifyJwt } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { canUserViewProject } from "@/lib/projectAccess";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json({ error: "Forbidden: Access denied to this project" }, { status: 403 });
    }

    const sprints = await Sprint.find({ projectId: id }).sort({ startDate: 1 }).exec();

    const enrichedSprints = await Promise.all(
      sprints.map(async (sprint) => {
        const workItems = await WorkItem.find({ projectId: id, sprint: sprint._id });
        
        let progressPercent = 0;
        let completedCount = 0;
        let pendingCount = 0;
        let blockedCount = 0;
        let overdueCount = 0;

        if (workItems.length > 0) {
          const totalProgress = workItems.reduce((sum, item) => sum + (item.progress || 0), 0);
          progressPercent = Math.round(totalProgress / workItems.length);

          const now = new Date();
          workItems.forEach((item) => {
            if (item.status === "Done") {
              completedCount++;
            } else if (item.status === "Cancelled") {
              // cancelled is not pending
            } else {
              pendingCount++;
              if (item.status === "Blocked") {
                blockedCount++;
              }
              if (item.dueDate && new Date(item.dueDate) < now) {
                overdueCount++;
              }
            }
          });
        }

        return {
          ...sprint.toObject(),
          progressPercent,
          completedCount,
          pendingCount,
          blockedCount,
          overdueCount,
          totalCount: workItems.length,
        };
      })
    );

    return NextResponse.json({ data: enrichedSprints }, { status: 200 });
  } catch (error: any) {
    console.error("GET Sprints Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const project = await Project.findById(id).select("techOwner");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isProjectLead =
      payload.role === Role.SYSTEM_ADMIN ||
      payload.role === "ADMIN" ||
      payload.role === "TECH_MANAGER" ||
      (project.techOwner && project.techOwner.toString() === payload.userId);

    if (!isProjectLead) {
      return NextResponse.json({ error: "Forbidden: Sprints can only be managed by the Project Lead or Admins" }, { status: 403 });
    }

    const body = await req.json();

    const { name, goal, startDate, endDate } = body;
    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, Start Date, and End Date are required" }, { status: 400 });
    }

    const newSprint = await Sprint.create({
      projectId: id,
      name,
      goal: goal || "",
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "Planned",
      createdBy: payload.userId,
    });

    await logActivity(id, "sprint", `Created sprint "${name}"`, payload.userId);

    return NextResponse.json({ data: newSprint }, { status: 201 });
  } catch (error: any) {
    console.error("POST Sprint Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
