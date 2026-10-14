import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Bug } from "@/lib/models/Bug";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { canUserViewProject } from "@/lib/projectAccess";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(
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

    const isMongoId = mongoose.Types.ObjectId.isValid(bugId);
    const query = isMongoId
      ? { _id: bugId, projectId: id }
      : { bugId: bugId.toUpperCase(), projectId: id };

    const bug = await Bug.findOne(query)
      .populate("projectId", "title clientDetails techOwner")
      .populate("reportedBy", "name email role")
      .populate("assignee", "name email role")
      .populate("previousAssignee", "name email role")
      .populate("auditTrail.performedBy", "name email role")
      .populate("auditTrail.previousAssignee", "name email role")
      .populate("auditTrail.newAssignee", "name email role");

    if (!bug) {
      return NextResponse.json({ error: "Bug not found" }, { status: 404 });
    }

    return NextResponse.json({ data: bug }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
