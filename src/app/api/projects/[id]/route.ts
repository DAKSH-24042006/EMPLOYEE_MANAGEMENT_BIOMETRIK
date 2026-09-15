import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { ProjectVersion } from "@/lib/models/ProjectVersion";
import { WorkItem } from "@/lib/models/WorkItem";
import { ProjectBlocker } from "@/lib/models/ProjectBlocker";
import { TestCase } from "@/lib/models/TestCase";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { Role } from "@/lib/constants";

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

    const project = await Project.findById(id)
      .populate("createdBy", "name email role")
      .populate("techOwner", "name email role")
      .populate("techTeamMembers", "name email role")
      .populate("internalApproval.approvedBy", "name email role")
      .populate("salesApproval.approvedBy", "name email role")
      .populate("projectClosedBy", "name email role");

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: project }, { status: 200 });
  } catch (error: any) {
    console.error("GET Project Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PATCH — update details, enforce RBAC, validate closure conditions, and log activity
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const userRole = payload.role;
    const userId = payload.userId;

    await dbConnect();
    const existingProject = await Project.findById(id);
    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // --- Role-Based Access Control Checks ---
    // STRICT SECURITY: Only SYSTEM_ADMIN can decide project lead (techOwner) and manage members (techTeamMembers)
    if (userRole !== Role.SYSTEM_ADMIN) {
      if (body.techOwner !== undefined) {
        return NextResponse.json(
          { error: "Forbidden: Only System Administrator has access to decide or change the Project Lead." },
          { status: 403 }
        );
      }
      if (body.techTeamMembers !== undefined) {
        return NextResponse.json(
          { error: "Forbidden: Only System Administrator has access to add or modify project members." },
          { status: 403 }
        );
      }
    }

    if (userRole === "SALES_TEAM" || userRole === "SALES") {
      // Sales restrictions
      const restrictedFieldsForSales = [
        "feasibilityStatus", "techOwner", "techTeamMembers", "complexity", 
        "estimatedEffort", "estimatedDeliveryDate", "recommendedTechStack", 
        "uatStatus", "internalApproval", "projectClosed", "projectClosedBy", "projectClosedAt"
      ];
      for (const field of restrictedFieldsForSales) {
        if (body[field] !== undefined) {
          return NextResponse.json({ error: `Forbidden: Sales role cannot modify '${field}'` }, { status: 403 });
        }
      }
      // Sales status validation
      if (body.status !== undefined && ![
        "Requirement Created", "Submitted for Tech Review", "Clarification Required", "Signoff Pending"
      ].includes(body.status)) {
        return NextResponse.json({ error: "Forbidden: Sales role cannot move project to this stage" }, { status: 403 });
      }
    } else if (userRole === "TECH_TEAM") {
      // Tech restrictions
      const restrictedFieldsForTech = [
        "techOwner", "techTeamMembers", "salesApproval", "projectClosed", "projectClosedBy"
      ];
      for (const field of restrictedFieldsForTech) {
        if (body[field] !== undefined) {
          return NextResponse.json({ error: `Forbidden: Tech role cannot modify '${field}'` }, { status: 403 });
        }
      }
    } else if (userRole === "TECH_MANAGER") {
      // Tech Manager restrictions
      const restrictedFieldsForTechMgr = ["salesApproval"];
      for (const field of restrictedFieldsForTechMgr) {
        if (body[field] !== undefined) {
          return NextResponse.json({ error: `Forbidden: Tech Manager cannot modify '${field}'` }, { status: 403 });
        }
      }
    }

    // --- Project Closure Validation ---
    if (body.status === "Closed" || body.projectClosed === true) {
      // Closure conditions check
      // 1. Work items done
      const openWorkItems = await WorkItem.countDocuments({
        projectId: id,
        status: { $nin: ["Done", "Cancelled"] },
      });
      if (openWorkItems > 0) {
        return NextResponse.json({ error: "Closure blocked: There are active/incomplete work items." }, { status: 400 });
      }

      // 2. Critical/High blockers resolved
      const openBlockers = await ProjectBlocker.countDocuments({
        projectId: id,
        status: { $in: ["Open", "In Progress"] },
        priority: { $in: ["High", "Critical"] },
      });
      if (openBlockers > 0) {
        return NextResponse.json({ error: "Closure blocked: Critical or High priority blockers are still open." }, { status: 400 });
      }

      // 3. Test cases passed/resolved
      const totalTestCases = await TestCase.countDocuments({ projectId: id });
      const passedTestCases = await TestCase.countDocuments({ projectId: id, status: "Passed" });
      if (totalTestCases > 0 && passedTestCases < totalTestCases) {
        return NextResponse.json({ error: `Closure blocked: Only ${passedTestCases}/${totalTestCases} test cases have Passed.` }, { status: 400 });
      }

      // 4. UAT Passed
      if (body.uatStatus !== "Passed" && body.uatStatus !== "Client Accepted" && existingProject.uatStatus !== "Passed" && existingProject.uatStatus !== "Client Accepted") {
        return NextResponse.json({ error: "Closure blocked: Project UAT has not been passed or accepted by client." }, { status: 400 });
      }

      // 5. Signoffs approved
      const internalApproved = body.internalApproval?.approved ?? existingProject.internalApproval?.approved;
      const salesApproved = body.salesApproval?.approved ?? existingProject.salesApproval?.approved;
      const clientSignoff = body.clientSignoffStatus ?? existingProject.clientSignoffStatus;

      if (!internalApproved) {
        return NextResponse.json({ error: "Closure blocked: Internal delivery approval is missing." }, { status: 400 });
      }
      if (!salesApproved) {
        return NextResponse.json({ error: "Closure blocked: Sales signoff approval is missing." }, { status: 400 });
      }
      if (clientSignoff === "Pending") {
        return NextResponse.json({ error: "Closure blocked: Client signoff status is still Pending." }, { status: 400 });
      }
    }

    // Save previous snapshot for version history
    const previousSnapshot = JSON.parse(JSON.stringify(existingProject));

    // Handle normal project update assignments
    if (body.title !== undefined) existingProject.title = body.title;
    if (body.clientDetails !== undefined) {
      existingProject.clientDetails = {
        companyName: body.clientDetails.companyName ?? existingProject.clientDetails.companyName,
        contactPerson: body.clientDetails.contactPerson ?? existingProject.clientDetails.contactPerson,
        email: body.clientDetails.email ?? existingProject.clientDetails.email,
        contactNumber: body.clientDetails.contactNumber ?? existingProject.clientDetails.contactNumber,
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

    // --- Assign Tech Review Fields ---
    if (body.feasibilityStatus !== undefined) existingProject.feasibilityStatus = body.feasibilityStatus;
    if (body.techOwner !== undefined) existingProject.techOwner = body.techOwner || undefined;
    if (body.techTeamMembers !== undefined) existingProject.techTeamMembers = body.techTeamMembers;
    if (body.complexity !== undefined) existingProject.complexity = body.complexity;
    if (body.estimatedEffort !== undefined) existingProject.estimatedEffort = body.estimatedEffort;
    if (body.estimatedDeliveryDate !== undefined) existingProject.estimatedDeliveryDate = body.estimatedDeliveryDate ? new Date(body.estimatedDeliveryDate) : undefined;
    if (body.assumptions !== undefined) existingProject.assumptions = body.assumptions;
    if (body.risks !== undefined) existingProject.risks = body.risks;
    if (body.openClarifications !== undefined) existingProject.openClarifications = body.openClarifications;
    if (body.recommendedTechStack !== undefined) existingProject.recommendedTechStack = body.recommendedTechStack;

    // --- Assign UAT ---
    if (body.uatStatus !== undefined) existingProject.uatStatus = body.uatStatus;

    // --- Assign Delivery & Signoff ---
    if (body.deliveredModules !== undefined) existingProject.deliveredModules = body.deliveredModules;
    if (body.pendingItems !== undefined) existingProject.pendingItems = body.pendingItems;
    if (body.knownLimitations !== undefined) existingProject.knownLimitations = body.knownLimitations;
    if (body.deploymentDate !== undefined) existingProject.deploymentDate = body.deploymentDate ? new Date(body.deploymentDate) : undefined;
    if (body.handoverDocs !== undefined) existingProject.handoverDocs = body.handoverDocs;
    if (body.trainingCompleted !== undefined) existingProject.trainingCompleted = body.trainingCompleted;
    if (body.uatPassed !== undefined) existingProject.uatPassed = body.uatPassed;
    if (body.internalApproval !== undefined) {
      existingProject.internalApproval = {
        approved: body.internalApproval.approved,
        approvedBy: body.internalApproval.approved && userId ? (new mongoose.Types.ObjectId(userId) as any) : undefined,
        approvedAt: body.internalApproval.approved ? new Date() : undefined,
      };
    }
    if (body.salesApproval !== undefined) {
      existingProject.salesApproval = {
        approved: body.salesApproval.approved,
        approvedBy: body.salesApproval.approved && userId ? (new mongoose.Types.ObjectId(userId) as any) : undefined,
        approvedAt: body.salesApproval.approved ? new Date() : undefined,
      };
    }
    if (body.clientSignoffStatus !== undefined) existingProject.clientSignoffStatus = body.clientSignoffStatus;
    if (body.clientApprover !== undefined) existingProject.clientApprover = body.clientApprover;
    if (body.signoffAttachment !== undefined) existingProject.signoffAttachment = body.signoffAttachment;
    if (body.finalRemarks !== undefined) existingProject.finalRemarks = body.finalRemarks;

    // --- Closure Fields Set ---
    if (body.status === "Closed" || body.projectClosed === true) {
      existingProject.status = "Closed";
      existingProject.projectClosed = true;
      existingProject.projectClosedBy = userId as any;
      existingProject.projectClosedAt = new Date();
    }

    // Determine changed fields
    const changedFields: any[] = [];
    const fieldsToCompare = [
      "title", "extraAddOns", "useCase", "targetUsers", "functionalRequirements", 
      "nonFunctionalRequirements", "budget", "integrations", "priority", "status",
      "feasibilityStatus", "complexity", "estimatedEffort", "uatStatus", 
      "clientSignoffStatus", "projectClosed"
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

    // Save only if meaningful changes happened
    if (changedFields.length > 0 || body.changeReason) {
      const updatedProject = await existingProject.save();
      const newSnapshot = JSON.parse(JSON.stringify(updatedProject));

      const versionCount = await ProjectVersion.countDocuments({ projectId: id });
      await ProjectVersion.create({
        projectId: id,
        version: versionCount + 1,
        editedBy: userId,
        previousSnapshot,
        newSnapshot,
        changedFields,
        changeReason: body.changeReason || "Project settings updated",
      });

      // Log Activities
      for (const change of changedFields) {
        await logActivity(
          id,
          "project_status",
          `Updated project field ${change.field} from "${change.oldValue}" to "${change.newValue}"`,
          userId
        );
      }

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

// DELETE — remove a project
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (payload.role !== "ADMIN") return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });

    const { id } = await params;
    await dbConnect();

    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ message: "Project deleted successfully" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
