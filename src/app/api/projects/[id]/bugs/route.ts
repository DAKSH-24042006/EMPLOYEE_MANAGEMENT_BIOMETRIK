import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { Bug } from "@/lib/models/Bug";
import { Counter } from "@/lib/models/Counter";
import { User } from "@/lib/models/User";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { canUserViewProject } from "@/lib/projectAccess";
import { logActivity } from "@/lib/activity";
import { sendBugReportedEmail, getBaseAppUrl } from "@/lib/mailer";

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

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const severity = url.searchParams.get("severity") || "";
    const status = url.searchParams.get("status") || "";
    const assignee = url.searchParams.get("assignee") || "";

    const query: any = { projectId: id };

    if (severity && severity !== "all") {
      query.severity = severity;
    }
    if (status && status !== "all") {
      query.status = status;
    }
    if (assignee && assignee !== "all") {
      query.assignee = assignee;
    }
    if (search) {
      query.$or = [
        { bugId: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const bugs = await Bug.find(query)
      .populate("reportedBy", "name email role")
      .populate("assignee", "name email role")
      .populate("previousAssignee", "name email role")
      .populate("qaAssignee", "name email role")
      .populate("auditTrail.performedBy", "name email role")
      .populate("auditTrail.previousAssignee", "name email role")
      .populate("auditTrail.newAssignee", "name email role")
      .sort({ createdAt: -1 });

    return NextResponse.json({ data: bugs }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const project = await Project.findById(id)
      .populate("techOwner", "name email role")
      .populate("qaLead", "name email role");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, severity, remarks, assignee, qaAssignee, attachments } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Bug title is required" }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Bug description is required" }, { status: 400 });
    }
    if (description.length > 400) {
      return NextResponse.json(
        {
          error: `Description length (${description.length} chars) exceeds the maximum allowed limit (~350-400 chars)`,
        },
        { status: 400 }
      );
    }

    const trimmedRemarks = (remarks || body.latestReporterRemarks || "").trim();
    if (!trimmedRemarks) {
      return NextResponse.json(
        { error: "Zero-bypass policy: Mandatory remarks are required when reporting a bug" },
        { status: 400 }
      );
    }

    // Default assignee to Project Manager (techOwner) if not explicitly provided
    const isLeadOrAdmin =
      payload.role === "SYSTEM_ADMIN" ||
      payload.role === "ADMIN" ||
      project.techOwner?._id?.toString() === payload.userId;

    let designatedAssigneeId = assignee;
    if (!designatedAssigneeId) {
      if (project.techOwner?._id) {
        designatedAssigneeId = project.techOwner._id;
      } else {
        designatedAssigneeId = payload.userId;
      }
    } else {
      // If user specified an assignee at creation time:
      const isSelf = designatedAssigneeId.toString() === payload.userId;
      const isAssigningToPM =
        project.techOwner?._id?.toString() === designatedAssigneeId.toString();
      if (!isLeadOrAdmin && !isSelf && !isAssigningToPM) {
        return NextResponse.json(
          {
            error:
              "Forbidden: Only the Project Manager or Admin can assign bugs to other developers. You may only assign to the Project Manager or self-assign to yourself.",
          },
          { status: 403 }
        );
      }
    }

    const assignedUser = await User.findById(designatedAssigneeId);
    if (!assignedUser) {
      return NextResponse.json({ error: "Designated assignee user not found" }, { status: 404 });
    }

    const reporterUser = await User.findById(payload.userId);

    // Atomic Counter for BUG-XXXX sequence
    const counter = await Counter.findOneAndUpdate(
      { _id: "bugId" },
      { $inc: { seq: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    const bugId = `BUG-${String(counter.seq).padStart(4, "0")}`;

    const newBug = new Bug({
      bugId,
      projectId: id,
      title: title.trim(),
      severity: severity || "Medium",
      description: description.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      reportedBy: payload.userId,
      reportedAt: new Date(),
      assignee: designatedAssigneeId,
      assignedAt: new Date(),
      previousAssignee: null,
      qaAssignee: qaAssignee || project.qaLead?._id || project.techOwner?._id || null,
      status: "OPEN",
      latestReporterRemarks: trimmedRemarks,
      qaOutcome: "PENDING",
      reopenCount: 0,
      auditTrail: [
        {
          timestamp: new Date(),
          performedBy: payload.userId,
          action: "REPORTED",
          previousStatus: undefined,
          newStatus: "OPEN",
          previousAssignee: null,
          newAssignee: designatedAssigneeId,
          remarks: trimmedRemarks,
        },
      ],
    });

    await newBug.save();

    await logActivity(
      id,
      "BUG_REPORTED",
      `Defect ${bugId} ("${title.trim()}") was reported by ${reporterUser?.name || "User"}`,
      payload.userId
    );

    // Dispatch email alert to PM (designated assignee)
    const baseUrl = getBaseAppUrl();
    const bugUrl = `${baseUrl}/projects/${id}?tab=bugs&bugId=${bugId}`;

    if (assignedUser?.email) {
      sendBugReportedEmail({
        toEmail: assignedUser.email,
        recipientName: assignedUser.name,
        bugId,
        title: title.trim(),
        severity: severity || "Medium",
        description: description.trim(),
        remarks: trimmedRemarks,
        reportedByName: reporterUser?.name || "Team Member",
        projectName: project.title,
        bugUrl,
      }).catch((err) => console.error("[BugsAPI] Email dispatch error:", err));
    }

    const populatedBug = await Bug.findById(newBug._id)
      .populate("reportedBy", "name email role")
      .populate("assignee", "name email role")
      .populate("previousAssignee", "name email role")
      .populate("auditTrail.performedBy", "name email role");

    return NextResponse.json(
      { data: populatedBug, message: "Bug reported successfully" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[BugsAPI] Error creating bug:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
