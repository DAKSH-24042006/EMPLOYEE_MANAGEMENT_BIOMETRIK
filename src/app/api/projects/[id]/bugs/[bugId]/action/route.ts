import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { Bug } from "@/lib/models/Bug";
import { User } from "@/lib/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { canUserViewProject } from "@/lib/projectAccess";
import { logActivity } from "@/lib/activity";
import mongoose from "mongoose";
import {
  sendBugAssignedEmail,
  sendBugReassignedEmail,
  sendBugFixedEmail,
  sendBugQAVerifiedEmail,
  getBaseAppUrl,
} from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; bugId: string }> }
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

    const { id, bugId } = await params;
    await dbConnect();

    const canView = await canUserViewProject(id, payload.userId, payload.role);
    if (!canView) {
      return NextResponse.json(
        { error: "Forbidden: Access denied to this project" },
        { status: 403 }
      );
    }

    const project = await Project.findById(id).populate("techOwner", "name email role");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isMongoId = mongoose.Types.ObjectId.isValid(bugId);
    const query = isMongoId
      ? { _id: bugId, projectId: id }
      : { bugId: bugId.toUpperCase(), projectId: id };

    const bug = await Bug.findOne(query)
      .populate("assignee", "name email role")
      .populate("previousAssignee", "name email role")
      .populate("qaAssignee", "name email role");

    if (!bug) {
      return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    const body = await req.json();
    const { action, remarks, newAssigneeId, newQaAssigneeId } = body;

    if (!remarks || !remarks.trim()) {
      return NextResponse.json(
        { error: "Zero-bypass policy: Mandatory remarks are strictly required for this action." },
        { status: 400 }
      );
    }

    const currentUser = await User.findById(payload.userId);
    const techOwner = project.techOwner as any;
    const currentAssigneeUser = bug.assignee as any;
    const prevAssigneeUser = bug.previousAssignee as any;
    const currentQaAssigneeUser = bug.qaAssignee as any;

    const isAdmin = payload.role === "SYSTEM_ADMIN" || payload.role === "ADMIN";
    const isPM = techOwner?._id?.toString() === payload.userId;
    const isAssignedDev = currentAssigneeUser?._id?.toString() === payload.userId;
    const isDesignatedQA = currentQaAssigneeUser?._id?.toString() === payload.userId;
    const isQA =
      isDesignatedQA ||
      isPM ||
      isAdmin ||
      payload.role === "QA" ||
      payload.role === "TESTER" ||
      currentUser?.role === "QA" ||
      currentUser?.role === "TESTER";

    const baseUrl = getBaseAppUrl();
    const bugUrl = `${baseUrl}/projects/${id}?tab=bugs&bugId=${bug.bugId}`;

    const trimmedRemarks = remarks.trim();
    const prevStatus = bug.status;
    const performedById = new mongoose.Types.ObjectId(payload.userId);

    switch (action) {
      case "ASSIGN": {
        if (!newAssigneeId) {
          return NextResponse.json({ error: "New assignee ID is required" }, { status: 400 });
        }

        // BRD Section 5: PM and Super Admin can assign to any eligible member; Developers can self-assign bugs to themselves.
        const isSelfAssign = newAssigneeId.toString() === payload.userId;
        if (!isAdmin && !isPM && !isSelfAssign) {
          return NextResponse.json(
            {
              error:
                "Forbidden: Only the Project Manager or Admin can assign bugs to other developers. Developers can only self-assign bugs to themselves.",
            },
            { status: 403 }
          );
        }

        const newAssignee = await User.findById(newAssigneeId);
        if (!newAssignee) {
          return NextResponse.json({ error: "Assignee user not found" }, { status: 404 });
        }

        const prevAssigneeId = currentAssigneeUser?._id || null;
        bug.previousAssignee = prevAssigneeId;
        bug.assignee = newAssignee._id as any;
        bug.assignedAt = new Date();
        bug.status = "ASSIGNED";

        bug.auditTrail.push({
          timestamp: new Date(),
          performedBy: performedById,
          action: "ASSIGNED",
          previousStatus: prevStatus,
          newStatus: "ASSIGNED",
          previousAssignee: prevAssigneeId,
          newAssignee: newAssignee._id as any,
          remarks: trimmedRemarks,
        });

        await bug.save();

        await logActivity(
          id,
          "BUG_ASSIGNED",
          `Defect ${bug.bugId} assigned to ${newAssignee.name} by ${currentUser?.name || "User"}`,
          payload.userId
        );

        if (newAssignee.email) {
          sendBugAssignedEmail({
            toEmail: newAssignee.email,
            recipientName: newAssignee.name,
            bugId: bug.bugId,
            title: bug.title,
            severity: bug.severity,
            remarks: trimmedRemarks,
            assignedByName: currentUser?.name || "Project Lead",
            projectName: project.title,
            bugUrl,
          }).catch((err) => console.error("[BugsAPI] Assign email error:", err));
        }
        break;
      }

      case "REASSIGN": {
        if (!isAdmin && !isPM) {
          return NextResponse.json(
            { error: "Forbidden: Only Project Manager or Admin can reassign bugs." },
            { status: 403 }
          );
        }
        if (!newAssigneeId) {
          return NextResponse.json({ error: "New assignee ID is required" }, { status: 400 });
        }

        const newAssignee = await User.findById(newAssigneeId);
        if (!newAssignee) {
          return NextResponse.json({ error: "Assignee user not found" }, { status: 404 });
        }

        const prevAssigneeId = currentAssigneeUser?._id || null;
        const prevAssigneeName = currentAssigneeUser?.name || "Previous Assignee";
        bug.previousAssignee = prevAssigneeId;
        bug.assignee = newAssignee._id as any;
        bug.assignedAt = new Date();

        bug.auditTrail.push({
          timestamp: new Date(),
          performedBy: performedById,
          action: "REASSIGNED",
          previousStatus: prevStatus,
          newStatus: bug.status,
          previousAssignee: prevAssigneeId,
          newAssignee: newAssignee._id as any,
          remarks: trimmedRemarks,
        });

        await bug.save();

        await logActivity(
          id,
          "BUG_REASSIGNED",
          `Defect ${bug.bugId} reassigned from ${prevAssigneeName} to ${newAssignee.name} by ${currentUser?.name || "PM"}`,
          payload.userId
        );

        /* Notification disabled: Bug Reassigned email suppressed per specification
        if (newAssignee.email) {
          sendBugReassignedEmail({
            toEmail: newAssignee.email,
            recipientName: newAssignee.name,
            bugId: bug.bugId,
            title: bug.title,
            severity: bug.severity,
            remarks: trimmedRemarks,
            previousAssigneeName: prevAssigneeName,
            reassignedByName: currentUser?.name || "Project Lead",
            projectName: project.title,
            bugUrl,
          }).catch((err) => console.error("[BugsAPI] Reassign email error:", err));
        }
        */
        break;
      }

      case "FIX": {
        if (!isAssignedDev && !isPM && !isAdmin) {
          return NextResponse.json(
            {
              error: "Forbidden: Only the assigned developer or PM can submit a fix for this bug.",
            },
            { status: 403 }
          );
        }

        if (bug.status !== "ASSIGNED" && bug.status !== "FAIL") {
          return NextResponse.json(
            {
              error: `Cannot submit fix for bug in '${bug.status}' status. Bug must be ASSIGNED or FAIL.`,
            },
            { status: 400 }
          );
        }

        bug.previousAssignee =
          currentAssigneeUser?._id || new mongoose.Types.ObjectId(payload.userId);
        bug.status = "FIXED";
        bug.latestDeveloperRemarks = trimmedRemarks;

        bug.auditTrail.push({
          timestamp: new Date(),
          performedBy: performedById,
          action: "FIXED",
          previousStatus: prevStatus,
          newStatus: "FIXED",
          previousAssignee: bug.previousAssignee,
          newAssignee: currentAssigneeUser?._id,
          remarks: trimmedRemarks,
        });

        await bug.save();

        await logActivity(
          id,
          "BUG_FIXED",
          `Defect ${bug.bugId} was marked as FIXED by ${currentUser?.name || "Developer"}`,
          payload.userId
        );

        /* Notification disabled: Fix Submitted for QA email suppressed per specification
        const recipientEmails: string[] = [];
        if (techOwner?.email) recipientEmails.push(techOwner.email);

        const qaUsers = await User.find({ role: { $in: ["QA", "TESTER"] } }).select("email");
        qaUsers.forEach((u) => {
          if (u.email && !recipientEmails.includes(u.email)) recipientEmails.push(u.email);
        });

        sendBugFixedEmail({
          toEmails: recipientEmails,
          bugId: bug.bugId,
          title: bug.title,
          severity: bug.severity,
          remarks: trimmedRemarks,
          developerName: currentUser?.name || "Developer",
          projectName: project.title,
          bugUrl,
        }).catch((err) => console.error("[BugsAPI] Fix email error:", err));
        */
        break;
      }

      case "QA_PASS": {
        if (!isQA && !isPM && !isAdmin) {
          return NextResponse.json(
            { error: "Forbidden: Only QA Testers, Project Manager, or Admin can verify bugs." },
            { status: 403 }
          );
        }

        if (bug.status !== "FIXED") {
          return NextResponse.json(
            { error: `Cannot QA pass bug in '${bug.status}' status. Bug must be in FIXED status.` },
            { status: 400 }
          );
        }

        bug.status = "PASS";
        bug.qaOutcome = "PASS";
        bug.latestQARemarks = trimmedRemarks;

        bug.auditTrail.push({
          timestamp: new Date(),
          performedBy: performedById,
          action: "QA_PASS",
          previousStatus: "FIXED",
          newStatus: "PASS",
          previousAssignee: currentAssigneeUser?._id,
          newAssignee: currentAssigneeUser?._id,
          remarks: trimmedRemarks,
          qaResult: "PASS",
        });

        await bug.save();

        await logActivity(
          id,
          "BUG_QA_PASS",
          `Defect ${bug.bugId} PASSED QA verification (signed off by ${currentUser?.name || "QA"})`,
          payload.userId
        );

        /* Notification disabled: Bug Resolved / Closed email suppressed per specification
        const recipientEmails: string[] = [];
        if (techOwner?.email) recipientEmails.push(techOwner.email);
        if (currentAssigneeUser?.email && !recipientEmails.includes(currentAssigneeUser.email)) {
          recipientEmails.push(currentAssigneeUser.email);
        }

        sendBugQAVerifiedEmail({
          toEmails: recipientEmails,
          bugId: bug.bugId,
          title: bug.title,
          severity: bug.severity,
          outcome: "PASS",
          remarks: trimmedRemarks,
          qaName: currentUser?.name || "QA Tester",
          projectName: project.title,
          bugUrl,
        }).catch((err) => console.error("[BugsAPI] QA Pass email error:", err));
        */
        break;
      }

      case "QA_FAIL": {
        if (!isQA && !isPM && !isAdmin) {
          return NextResponse.json(
            { error: "Forbidden: Only QA Testers, Project Manager, or Admin can verify bugs." },
            { status: 403 }
          );
        }

        if (bug.status !== "FIXED") {
          return NextResponse.json(
            { error: `Cannot QA fail bug in '${bug.status}' status. Bug must be in FIXED status.` },
            { status: 400 }
          );
        }

        const returningDevId = prevAssigneeUser?._id || currentAssigneeUser?._id;
        if (returningDevId) {
          bug.assignee = returningDevId;
          bug.assignedAt = new Date();
        }

        bug.status = "FAIL";
        bug.qaOutcome = "FAIL";
        bug.latestQARemarks = trimmedRemarks;
        bug.reopenCount = (bug.reopenCount || 0) + 1;

        bug.auditTrail.push({
          timestamp: new Date(),
          performedBy: performedById,
          action: "QA_FAIL",
          previousStatus: "FIXED",
          newStatus: "FAIL",
          previousAssignee: currentAssigneeUser?._id,
          newAssignee: returningDevId,
          remarks: trimmedRemarks,
          qaResult: "FAIL",
        });

        await bug.save();

        await logActivity(
          id,
          "BUG_QA_FAIL",
          `Defect ${bug.bugId} FAILED QA verification and auto-returned to developer (Tested by ${currentUser?.name || "QA"})`,
          payload.userId
        );

        const recipientEmails: string[] = [];
        if (techOwner?.email) recipientEmails.push(techOwner.email);
        const returningDev = await User.findById(returningDevId);
        if (returningDev?.email && !recipientEmails.includes(returningDev.email)) {
          recipientEmails.push(returningDev.email);
        }

        sendBugQAVerifiedEmail({
          toEmails: recipientEmails,
          bugId: bug.bugId,
          title: bug.title,
          severity: bug.severity,
          outcome: "FAIL",
          remarks: trimmedRemarks,
          qaName: currentUser?.name || "QA Tester",
          projectName: project.title,
          bugUrl,
        }).catch((err) => console.error("[BugsAPI] QA Fail email error:", err));
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: '${action}'` }, { status: 400 });
    }

    const updatedBug = await Bug.findById(bug._id)
      .populate("reportedBy", "name email role")
      .populate("assignee", "name email role")
      .populate("previousAssignee", "name email role")
      .populate("auditTrail.performedBy", "name email role")
      .populate("auditTrail.previousAssignee", "name email role")
      .populate("auditTrail.newAssignee", "name email role");

    return NextResponse.json({
      data: updatedBug,
      message: `Bug action '${action}' completed successfully`,
    });
  } catch (error: any) {
    console.error("[BugsActionAPI] Error performing bug action:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
