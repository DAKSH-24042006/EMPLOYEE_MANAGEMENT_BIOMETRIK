import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { RoleModel } from "@/lib/models/Role";
import { User } from "@/lib/models/User";
import { Role } from "@/lib/constants";
import { verifyJwt } from "@/lib/auth";
import { cookies } from "next/headers";

async function isSystemAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return false;
  const decoded = await verifyJwt(token);
  return !!(decoded && decoded.role === Role.SYSTEM_ADMIN);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSystemAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized: System Admin access required" },
        { status: 403 }
      );
    }

    const { id } = await params;
    await dbConnect();

    const roleDoc = await RoleModel.findById(id);
    if (!roleDoc) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Only SYSTEM_ADMIN cannot be deleted
    if (roleDoc.name === Role.SYSTEM_ADMIN) {
      return NextResponse.json(
        { error: "Default System Administrator role cannot be deleted" },
        { status: 400 }
      );
    }

    // Check if any user is currently assigned this role
    const assignedUserCount = await User.countDocuments({ role: roleDoc.name });
    if (assignedUserCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete role '${roleDoc.name}' because ${assignedUserCount} employee(s) are currently assigned to it.`,
        },
        { status: 400 }
      );
    }

    await RoleModel.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: `Role '${roleDoc.name}' deleted successfully` });
  } catch (error: any) {
    console.error("Delete Role Error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete role" }, { status: 500 });
  }
}
