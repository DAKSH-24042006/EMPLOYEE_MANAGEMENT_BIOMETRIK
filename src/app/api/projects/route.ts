import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { User } from "@/lib/models/User";
import { ProjectBlocker } from "@/lib/models/ProjectBlocker";
import { WorkItem } from "@/lib/models/WorkItem";
import { Sprint } from "@/lib/models/Sprint";
import { verifyJwt } from "@/lib/auth";

import { getProjectViewFilter } from "@/lib/projectAccess";

export const dynamic = "force-dynamic";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

function calculateRequirementCompleteness(project: any) {
  let filled = 0;
  const fields = [
    project.title,
    project.useCase,
    project.targetUsers,
    project.functionalRequirements,
    project.nonFunctionalRequirements,
    project.budget,
    project.clientDetails?.contactPerson,
  ];
  fields.forEach((f) => {
    if (f && f.trim() !== "") filled++;
  });
  const hasFeatures = Object.values(project.features || {}).some((v) => v === true);
  if (hasFeatures) filled++;
  return Math.round((filled / 8) * 100);
}

export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Fetch projects visible to this user (Assigned member, Project Lead, or System Admin)
    const filter = await getProjectViewFilter(payload.userId, payload.role);

    const projects = await Project.find(filter)
      .populate("createdBy", "name email role")
      .populate("techOwner", "name email role")
      .populate("productOwner", "name email role phoneNumber")
      .populate("techTeamMembers", "name email role")
      .sort({ createdAt: -1 })
      .exec();

    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const openBlockersCount = await ProjectBlocker.countDocuments({
          projectId: project._id,
          status: { $in: ["Open", "In Progress"] },
        });

        const workItems = await WorkItem.find({ projectId: project._id });
        let progressPercent = 0;
        let overdueWorkItemsCount = 0;
        if (workItems.length > 0) {
          const totalProgress = workItems.reduce((sum, item) => sum + (item.progress || 0), 0);
          progressPercent = Math.round(totalProgress / workItems.length);

          const now = new Date();
          overdueWorkItemsCount = workItems.filter(
            (item) =>
              item.dueDate &&
              new Date(item.dueDate) < now &&
              item.status !== "Done" &&
              item.status !== "Cancelled"
          ).length;
        }

        const activeSprintDoc = await Sprint.findOne({
          projectId: project._id,
          status: "Active",
        });

        const requirementCompletenessScore = calculateRequirementCompleteness(project);

        const projObj = project.toObject();
        return {
          ...projObj,
          openBlockersCount,
          progressPercent,
          overdueWorkItemsCount,
          activeSprint: activeSprintDoc ? activeSprintDoc.name : "None",
          requirementCompletenessScore,
          pendingSignoff: project.status === "Signoff Pending",
        };
      })
    );

    return NextResponse.json(
      { data: enrichedProjects },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: any) {
    console.error("List Projects Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
