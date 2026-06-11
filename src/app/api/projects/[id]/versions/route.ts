import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { ProjectVersion } from "@/lib/models/ProjectVersion";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export async function GET(
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
    await dbConnect();

    const versions = await ProjectVersion.find({ projectId: id })
      .populate("editedBy", "name email role")
      .sort({ version: -1 });

    return NextResponse.json({ data: versions }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
