import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Role } from "@/lib/constants";

import bcrypt from "bcryptjs";
import { verifyJwt } from "@/lib/auth";
import { cookies } from "next/headers";

async function isAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return false;

  const decoded = await verifyJwt(token);
  return decoded && decoded.role === Role.ADMIN;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { name, email, role, password, phoneNumber, location } = await req.json();

    if (phoneNumber !== undefined && !/^[0-9]+$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Phone number must contain only digits" },
        { status: 400 }
      );
    }

    if (phoneNumber === "" || location === "") {
      return NextResponse.json(
        { error: "Phone number and location cannot be empty" },
        { status: 400 }
      );
    }
    const { id } = await params;

    await dbConnect();

    const updateData: any = { name, email, role, phoneNumber, location };
    
    // If password is provided, hash it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
