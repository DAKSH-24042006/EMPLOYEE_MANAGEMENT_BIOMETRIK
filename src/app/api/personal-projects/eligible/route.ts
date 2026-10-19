import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { requireAuth } from "@/lib/apiAuth";
import { User } from "@/lib/models/User";
import { Project } from "@/lib/models/Project";
import { PersonalProject } from "@/lib/models/PersonalProject";
import { Role } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET /api/personal-projects/eligible — fetch list of projects eligible to be pinned
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await dbConnect();

    // Verify current user from trusted DB record
    const user = await User.findById(authResult.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isSystemAdmin = user.role === Role.SYSTEM_ADMIN;

    // Get project IDs already pinned by this user
    const existingPins = await PersonalProject.find({ user: user._id }).select("project");
    const alreadyPinnedIds = existingPins.map((p) => p.project);

    // Build filter based on role and membership
    let query: any;

    if (isSystemAdmin) {
      // System Admin exception: eligible to pin any existing project
      query = {
        _id: { $nin: alreadyPinnedIds },
      };
    } else {
      // Ordinary employees and other roles: must be PM, PO, QA, or Dev
      query = {
        _id: { $nin: alreadyPinnedIds },
        $or: [
          { techOwner: user._id },
          { productOwner: user._id },
          { productOwners: user._id },
          { qaLead: user._id },
          { techTeamMembers: user._id },
        ],
      };
    }

    const eligibleProjects = await Project.find(query)
      .populate("techOwner", "name email")
      .select("title clientDetails status techOwner timeline estimatedDeliveryDate")
      .sort({ updatedAt: -1 });

    const data = eligibleProjects.map((p) => ({
      _id: p._id,
      title: p.title || p.clientDetails?.companyName || "Untitled Project",
      status: p.status || "Active",
      clientName: p.clientDetails?.companyName || "",
      projectManager: p.techOwner ? (p.techOwner as any).name : "Unassigned",
    }));

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
