import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Project } from "@/lib/models/Project";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

// GET /api/user/pinned-projects — fetch pinned projects for the logged in user
export async function GET() {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(payload.userId).populate({
      path: "pinnedProjects",
      populate: [
        { path: "techOwner", select: "name email role" },
        { path: "productOwner", select: "name email role" },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user.pinnedProjects || [] }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/user/pinned-projects — pin a project to user's quick access
export async function POST(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    await dbConnect();

    // Verify project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await User.findByIdAndUpdate(
      payload.userId,
      { $addToSet: { pinnedProjects: projectId } },
      { new: true }
    );

    return NextResponse.json(
      { message: "Project pinned to dashboard shortcuts", projectId },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/user/pinned-projects — remove project from user's quick access
export async function DELETE(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    await dbConnect();

    await User.findByIdAndUpdate(
      payload.userId,
      { $pull: { pinnedProjects: projectId } },
      { new: true }
    );

    return NextResponse.json(
      { message: "Project removed from shortcuts", projectId },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
