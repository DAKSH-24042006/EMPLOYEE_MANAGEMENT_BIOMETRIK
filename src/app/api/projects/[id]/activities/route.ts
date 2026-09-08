import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { ProjectActivity } from "@/lib/models/ProjectActivity";
import { verifyJwt } from "@/lib/auth";

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
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await dbConnect();

    const activities = await ProjectActivity.find({ projectId: id })
      .populate("performedBy", "name email role")
      .sort({ createdAt: -1 })
      .exec();

    return NextResponse.json({ data: activities }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Activities Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
