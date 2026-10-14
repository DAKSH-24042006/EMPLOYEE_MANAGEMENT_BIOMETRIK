import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Bug } from "@/lib/models/Bug";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

    await dbConnect();

    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const projectId = url.searchParams.get("projectId") || "";
    const severity = url.searchParams.get("severity") || "";
    const status = url.searchParams.get("status") || "";
    const assignee = url.searchParams.get("assignee") || "";
    const reportedBy = url.searchParams.get("reportedBy") || "";
    const qaOutcome = url.searchParams.get("qaOutcome") || "";
    const startDate = url.searchParams.get("startDate") || "";
    const endDate = url.searchParams.get("endDate") || "";

    const query: any = {};

    if (projectId && projectId !== "all") {
      query.projectId = projectId;
    }
    if (severity && severity !== "all") {
      query.severity = severity;
    }
    if (status && status !== "all") {
      query.status = status;
    }
    if (assignee && assignee !== "all") {
      query.assignee = assignee;
    }
    if (reportedBy && reportedBy !== "all") {
      query.reportedBy = reportedBy;
    }
    if (qaOutcome && qaOutcome !== "all") {
      query.qaOutcome = qaOutcome;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    if (search) {
      query.$or = [
        { bugId: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const bugs = await Bug.find(query)
      .populate("projectId", "title clientDetails techOwner")
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
    console.error("[BugHistoryAPI] Error fetching bug history:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
