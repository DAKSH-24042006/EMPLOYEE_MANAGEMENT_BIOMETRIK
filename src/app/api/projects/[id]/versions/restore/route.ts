import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { ProjectVersion } from "@/lib/models/ProjectVersion";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

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
    const body = await req.json();
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json({ error: "Version ID is required" }, { status: 400 });
    }

    await dbConnect();

    const versionDoc = await ProjectVersion.findOne({ _id: versionId, projectId: id });
    if (!versionDoc) {
      return NextResponse.json({ error: "Version snapshot not found" }, { status: 404 });
    }

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const previousSnapshot = JSON.parse(JSON.stringify(project));
    const targetSnapshot = versionDoc.newSnapshot;

    // Restore fields
    project.title = targetSnapshot.title || "";
    project.clientDetails = targetSnapshot.clientDetails;
    project.features = targetSnapshot.features;
    project.extraAddOns = targetSnapshot.extraAddOns || "";
    project.useCase = targetSnapshot.useCase || "";
    project.targetUsers = targetSnapshot.targetUsers || "";
    project.functionalRequirements = targetSnapshot.functionalRequirements || "";
    project.nonFunctionalRequirements = targetSnapshot.nonFunctionalRequirements || "";
    project.budget = targetSnapshot.budget || "";
    project.integrations = targetSnapshot.integrations || "";
    project.priority = targetSnapshot.priority || "Medium";
    project.status = targetSnapshot.status;
    project.timeline = targetSnapshot.timeline;

    const restoredProject = await project.save();
    const newSnapshot = JSON.parse(JSON.stringify(restoredProject));

    // Calculate changed fields
    const changedFields: any[] = [];
    const fields = [
      "title", "extraAddOns", "useCase", "targetUsers", 
      "functionalRequirements", "nonFunctionalRequirements", 
      "budget", "integrations", "priority", "status"
    ];
    for (const f of fields) {
      if (previousSnapshot[f] !== newSnapshot[f]) {
        changedFields.push({ field: f, oldValue: previousSnapshot[f], newValue: newSnapshot[f] });
      }
    }

    // Version increment
    const versionCount = await ProjectVersion.countDocuments({ projectId: id });
    await ProjectVersion.create({
      projectId: id,
      version: versionCount + 1,
      editedBy: payload.userId,
      previousSnapshot,
      newSnapshot,
      changedFields,
      changeReason: `Restored Version ${versionDoc.version}`,
    });

    return NextResponse.json({ message: "Version successfully restored!", data: restoredProject }, { status: 200 });
  } catch (error: any) {
    console.error("Restore version error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
