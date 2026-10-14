import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { TestCase } from "@/lib/models/TestCase";
import { Project } from "@/lib/models/Project";
import { verifyJwt } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { canUserEditProject } from "@/lib/projectAccess";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; testId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (payload.role === "SALES_TEAM" || payload.role === "SALES") {
      return NextResponse.json(
        { error: "Forbidden: Sales cannot edit test cases" },
        { status: 403 }
      );
    }

    const { id, testId } = await params;
    const body = await req.json();

    await dbConnect();
    const canEdit = await canUserEditProject(id, payload.userId, payload.role);
    if (!canEdit) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit test cases for this project." },
        { status: 403 }
      );
    }

    const testCase = await TestCase.findById(testId);
    if (!testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    const oldStatus = testCase.status;

    if (body.title !== undefined) testCase.title = body.title;
    if (body.steps !== undefined) testCase.steps = body.steps;
    if (body.expectedResult !== undefined) testCase.expectedResult = body.expectedResult;
    if (body.actualResult !== undefined) testCase.actualResult = body.actualResult;
    if (body.status !== undefined) testCase.status = body.status;
    if (body.workItemId !== undefined) testCase.workItemId = body.workItemId || undefined;

    // Set testedBy if status changes from Not Tested to anything else
    if (body.status !== undefined && body.status !== "Not Tested" && oldStatus === "Not Tested") {
      testCase.testedBy = payload.userId as any;
    } else if (body.testedBy !== undefined) {
      testCase.testedBy = body.testedBy || undefined;
    }

    // Append evidence attachments
    if (body.newEvidence) {
      const { name, url } = body.newEvidence;
      if (name && url) {
        testCase.evidenceAttachments.push({ name, url });
      }
    }

    await testCase.save();

    if (oldStatus !== testCase.status) {
      await logActivity(
        id,
        "test_case",
        `Test case "${testCase.title}" status changed from "${oldStatus}" to "${testCase.status}"`,
        payload.userId
      );
    } else {
      await logActivity(
        id,
        "test_case",
        `Updated test case "${testCase.title}" details`,
        payload.userId
      );
    }

    return NextResponse.json({ data: testCase }, { status: 200 });
  } catch (error: any) {
    console.error("PUT TestCase Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; testId: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (payload.role === "SALES_TEAM" || payload.role === "SALES") {
      return NextResponse.json(
        { error: "Forbidden: Sales cannot delete test cases" },
        { status: 403 }
      );
    }

    const { id, testId } = await params;
    await dbConnect();

    const testCase = await TestCase.findById(testId);
    if (!testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    const project = await Project.findById(id).select("techOwner qaLead");
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isSuperAdmin = payload.role === "SYSTEM_ADMIN" || payload.role === "ADMIN";
    const isPM = project.techOwner && project.techOwner.toString() === payload.userId;
    const isQA = project.qaLead && project.qaLead.toString() === payload.userId;

    if (!isSuperAdmin && !isPM && !isQA) {
      return NextResponse.json(
        { error: "Forbidden: Only the QA Lead, Project Manager, or Admin can delete test cases." },
        { status: 403 }
      );
    }

    await TestCase.findByIdAndDelete(testId);
    await logActivity(id, "test_case", `Deleted test case "${testCase.title}"`, payload.userId);

    return NextResponse.json({ message: "Test case deleted successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE TestCase Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
