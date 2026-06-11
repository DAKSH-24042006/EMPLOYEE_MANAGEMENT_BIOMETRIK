import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project, FEATURE_KEYS } from "@/lib/models/Project";
import { ProjectVersion } from "@/lib/models/ProjectVersion";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

// GET — fetch a single project
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const project = await Project.findById(id).populate("createdBy", "name email role");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH — update details and create version snapshot
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    await dbConnect();
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Save previous snapshot (de-serialize to clear Mongoose internals)
    const previousSnapshot = JSON.parse(JSON.stringify(existingProject));

    // Handle updates
    if (body.title !== undefined) existingProject.title = body.title;
    if (body.clientDetails !== undefined) {
      existingProject.clientDetails = {
        companyName: body.clientDetails.companyName ?? existingProject.clientDetails.companyName,
        contactPerson: body.clientDetails.contactPerson ?? existingProject.clientDetails.contactPerson,
        email: body.clientDetails.email ?? existingProject.clientDetails.email,
      };
    }
    if (body.features !== undefined) {
      existingProject.features = {
        visitorManagement: body.features.visitorManagement !== undefined ? body.features.visitorManagement : existingProject.features.visitorManagement,
        attendanceManagement: body.features.attendanceManagement !== undefined ? body.features.attendanceManagement : existingProject.features.attendanceManagement,
        digilockerAuthentication: body.features.digilockerAuthentication !== undefined ? body.features.digilockerAuthentication : existingProject.features.digilockerAuthentication,
        webApp: body.features.webApp !== undefined ? body.features.webApp : existingProject.features.webApp,
        androidApp: body.features.androidApp !== undefined ? body.features.androidApp : existingProject.features.androidApp,
        iosApp: body.features.iosApp !== undefined ? body.features.iosApp : existingProject.features.iosApp,
        videoKYC: body.features.videoKYC !== undefined ? body.features.videoKYC : existingProject.features.videoKYC,
        rbac: body.features.rbac !== undefined ? body.features.rbac : existingProject.features.rbac,
        adminPanel: body.features.adminPanel !== undefined ? body.features.adminPanel : existingProject.features.adminPanel,
        online: body.features.online !== undefined ? body.features.online : existingProject.features.online,
        offline: body.features.offline !== undefined ? body.features.offline : existingProject.features.offline,
        cloud: body.features.cloud !== undefined ? body.features.cloud : existingProject.features.cloud,
        onPremise: body.features.onPremise !== undefined ? body.features.onPremise : existingProject.features.onPremise,
      } as any;
    }
    if (body.extraAddOns !== undefined) existingProject.extraAddOns = body.extraAddOns;
    if (body.useCase !== undefined) existingProject.useCase = body.useCase;
    if (body.targetUsers !== undefined) existingProject.targetUsers = body.targetUsers;
    if (body.functionalRequirements !== undefined) existingProject.functionalRequirements = body.functionalRequirements;
    if (body.nonFunctionalRequirements !== undefined) existingProject.nonFunctionalRequirements = body.nonFunctionalRequirements;
    if (body.budget !== undefined) existingProject.budget = body.budget;
    if (body.integrations !== undefined) existingProject.integrations = body.integrations;
    if (body.priority !== undefined) existingProject.priority = body.priority;
    if (body.status !== undefined) existingProject.status = body.status;
    if (body.timeline !== undefined) {
      existingProject.timeline = {
        startDate: body.timeline[0] ? new Date(body.timeline[0]) : existingProject.timeline.startDate,
        endDate: body.timeline[1] ? new Date(body.timeline[1]) : existingProject.timeline.endDate,
      };
    }

    // Determine changed fields
    const changedFields: any[] = [];
    const fieldsToCompare = [
      "title",
      "extraAddOns",
      "useCase",
      "targetUsers",
      "functionalRequirements",
      "nonFunctionalRequirements",
      "budget",
      "integrations",
      "priority",
      "status"
    ];

    for (const field of fieldsToCompare) {
      if (previousSnapshot[field] !== (existingProject as any)[field]) {
        changedFields.push({
          field,
          oldValue: previousSnapshot[field],
          newValue: (existingProject as any)[field]
        });
      }
    }

    // Compare clientDetails
    if (JSON.stringify(previousSnapshot.clientDetails) !== JSON.stringify(existingProject.clientDetails)) {
      changedFields.push({
        field: "clientDetails",
        oldValue: previousSnapshot.clientDetails,
        newValue: existingProject.clientDetails
      });
    }

    // Compare features
    if (JSON.stringify(previousSnapshot.features) !== JSON.stringify(existingProject.features)) {
      changedFields.push({
        field: "features",
        oldValue: previousSnapshot.features,
        newValue: existingProject.features
      });
    }

    // Compare timeline
    const oldStart = new Date(previousSnapshot.timeline.startDate).getTime();
    const oldEnd = new Date(previousSnapshot.timeline.endDate).getTime();
    const newStart = existingProject.timeline.startDate.getTime();
    const newEnd = existingProject.timeline.endDate.getTime();
    if (oldStart !== newStart || oldEnd !== newEnd) {
      changedFields.push({
        field: "timeline",
        oldValue: previousSnapshot.timeline,
        newValue: existingProject.timeline
      });
    }

    // Save only if meaningful changes happened
    if (changedFields.length > 0) {
      const updatedProject = await existingProject.save();
      const newSnapshot = JSON.parse(JSON.stringify(updatedProject));

      const versionCount = await ProjectVersion.countDocuments({ projectId: id });
      await ProjectVersion.create({
        projectId: id,
        version: versionCount + 1,
        editedBy: payload.userId,
        previousSnapshot,
        newSnapshot,
        changedFields,
        changeReason: body.changeReason || "Manual edit",
      });

      return NextResponse.json({ data: updatedProject }, { status: 200 });
    }

    return NextResponse.json({ data: existingProject }, { status: 200 });
  } catch (error: any) {
    console.error("Project update error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT — full project update (from deployment)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    if (!data.companyName || !data.email) {
      return NextResponse.json({ error: "Company Name and Email are required." }, { status: 400 });
    }
    if (!data.timeline?.[0] || !data.timeline?.[1]) {
      return NextResponse.json({ error: "A valid timeline is required." }, { status: 400 });
    }

    const updatePayload = {
      clientDetails: {
        companyName: data.companyName,
        contactPerson: data.contactPerson || "",
        email: data.email,
        contactNumber: data.contactNumber || "",
      },
      features: FEATURE_KEYS.reduce((acc, key) => {
        acc[key] = !!data[key];
        return acc;
      }, {} as Record<string, boolean>),
      extraAddOns: data.extraAddOns || "",
      timeline: {
        startDate: new Date(data.timeline[0]),
        endDate: new Date(data.timeline[1]),
      },
      status: data.status || "Pending",
    };

    await dbConnect();
    const updated = await Project.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: Object.values(error.errors).map((e: any) => e.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — remove a project (from deployment)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ message: "Project deleted successfully" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
