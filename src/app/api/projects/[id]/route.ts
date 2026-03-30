import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export async function PATCH(
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
    const body = await req.json();
    const { status } = body;

    if (!status || !["Pending", "Reviewed", "Approved"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status provided. Must be 'Pending', 'Reviewed', or 'Approved'." },
        { status: 400 }
      );
    }

    await dbConnect();

    const updatedProject = await Project.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updatedProject }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
