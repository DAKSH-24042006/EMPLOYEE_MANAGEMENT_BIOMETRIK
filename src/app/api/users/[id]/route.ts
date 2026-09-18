import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Role } from "@/lib/constants";
import { verifyJwt } from "@/lib/auth";
import { cookies } from "next/headers";

// Authorization helper: strictly SYSTEM_ADMIN only
async function isSystemAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return false;

  const decoded = await verifyJwt(token);
  return !!(decoded && decoded.role === Role.SYSTEM_ADMIN);
}

// PATCH /api/users/[id] — Edit / Activate / Deactivate Employee
export async function PATCH(
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

    const { name, username, email, role, designation, status, phoneNumber, location, password } = await req.json();
    const { id } = await params;

    await dbConnect();

    const updateData: any = {};

    if (name !== undefined) updateData.name = name.trim();
    if (username !== undefined) {
      const normalizedUsername = username.toLowerCase().trim();
      if (normalizedUsername) {
        // Check uniqueness if changed
        const existingUsername = await User.findOne({ username: normalizedUsername, _id: { $ne: id } });
        if (existingUsername) {
          return NextResponse.json({ error: `Username '${normalizedUsername}' is already taken.` }, { status: 400 });
        }
        updateData.username = normalizedUsername;
      }
    }
    if (email !== undefined) {
      const normalized = email.toLowerCase().trim();
      if (normalized) {
        const existingEmail = await User.findOne({
          $or: [{ email: normalized }, { microsoftEmail: normalized }],
          _id: { $ne: id },
        });
        if (existingEmail) {
          return NextResponse.json({ error: `Email '${normalized}' is already registered to another account.` }, { status: 400 });
        }
        updateData.email = normalized;
        updateData.microsoftEmail = normalized;
      }
    }
    if (role !== undefined) updateData.role = role;
    if (designation !== undefined) updateData.designation = designation.trim();
    if (status !== undefined) updateData.status = status;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (location !== undefined) updateData.location = location;

    // Optional password reset by System Admin
    if (password && typeof password === "string" && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Update Employee Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/users/[id] — Remove Employee (SYSTEM_ADMIN ONLY)
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

    // Prevent admin from deleting themselves
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (user.role === Role.SYSTEM_ADMIN && user.username === "admin") {
      return NextResponse.json({ error: "Cannot delete the primary System Administrator account." }, { status: 400 });
    }

    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
