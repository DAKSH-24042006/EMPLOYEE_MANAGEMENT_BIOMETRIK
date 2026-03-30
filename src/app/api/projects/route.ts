import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { verifyJwt } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    await dbConnect();

    // Fetch projects sorted by newest first
    const projects = await Project.find({})
      .sort({ createdAt: -1 })
      // Since it's a client endpoint, we might lean to not populate the user entirely or just pick name
      .exec();

    return NextResponse.json(
      { data: projects },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
