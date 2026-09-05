import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { TestCase } from "@/lib/models/TestCase";
import { verifyJwt } from "@/lib/auth";
import { logActivity } from "@/lib/activity";

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

    const testCases = await TestCase.find({ projectId: id })
      .populate("testedBy", "name email role")
      .populate("workItemId", "title type status")
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({ data: testCases }, { status: 200 });
  } catch (error: any) {
    console.error("GET TestCases Error:", error);
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

    // Sales cannot manage test cases
    if (payload.role === "SALES_TEAM" || payload.role === "SALES") {
      return NextResponse.json({ error: "Forbidden: Sales cannot create test cases" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { title, steps, expectedResult, workItemId } = body;
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await dbConnect();

    const newTest = await TestCase.create({
      projectId: id,
      workItemId: workItemId || undefined,
      title,
      steps: steps || "",
      expectedResult: expectedResult || "",
      status: "Not Tested",
    });

    await logActivity(id, "test_case", `Created test case "${title}"`, payload.userId);

    return NextResponse.json({ data: newTest }, { status: 201 });
  } catch (error: any) {
    console.error("POST TestCase Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
