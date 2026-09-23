import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { RoleModel } from "@/lib/models/Role";
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

// Only SYSTEM_ADMIN is the default role in the system.
// All other roles are created dynamically by the System Admin.
const DEFAULT_ROLES = [
  {
    name: Role.SYSTEM_ADMIN,
    label: "System Administrator",
    description: "Full administrative access across all management portals",
    isSystem: true,
  },
];

export async function GET() {
  try {
    await dbConnect();

    // Check if SYSTEM_ADMIN role exists; if not, create it
    const systemAdminExists = await RoleModel.findOne({ name: Role.SYSTEM_ADMIN });
    if (!systemAdminExists) {
      await RoleModel.create(DEFAULT_ROLES[0]);
    }

    // Ensure only SYSTEM_ADMIN is marked isSystem=true
    await RoleModel.updateMany(
      { name: { $ne: Role.SYSTEM_ADMIN }, isSystem: true },
      { $set: { isSystem: false } }
    );

    const roles = await RoleModel.find({}).sort({ isSystem: -1, createdAt: 1 }).lean();
    return NextResponse.json(roles);
  } catch (error: any) {
    console.error("Fetch Roles Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isSystemAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized: System Admin access required to manage roles" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const rawName = (body.name || "").trim();
    const label = (body.label || rawName).trim();
    const description = (body.description || "").trim();

    if (!rawName) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    // Format role name to clean uppercase identifier e.g. "QA_TESTER"
    const normalizedName = rawName
      .toUpperCase()
      .replace(/[\s-]+/g, "_")
      .replace(/[^A-Z0-9_]/g, "");

    if (!normalizedName) {
      return NextResponse.json({ error: "Invalid role name characters" }, { status: 400 });
    }

    await dbConnect();

    const existing = await RoleModel.findOne({ name: normalizedName });
    if (existing) {
      return NextResponse.json(
        { error: `Role '${normalizedName}' already exists` },
        { status: 400 }
      );
    }

    const newRole = await RoleModel.create({
      name: normalizedName,
      label: label || normalizedName,
      description,
      isSystem: false,
    });

    return NextResponse.json(newRole, { status: 201 });
  } catch (error: any) {
    console.error("Create Role Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create role" }, { status: 500 });
  }
}
