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

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    await dbConnect();
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 403 });
    }

    const { name, email, password, role, phoneNumber, location } = await req.json();

    if (!name || !email || !password || !role || !phoneNumber || !location) {
      return NextResponse.json(
        { error: "Please provide all required fields (including Phone Number and Location)" },
        { status: 400 }
      );
    }

    if (!/^[0-9]+$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Phone number must contain only digits" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      phoneNumber,
      location,
    });

    const userResponse = await User.findById(user._id).select("-password");

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error: any) {
    console.error("Create User Error:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json({ error: Object.values(error.errors).map((err: any) => err.message).join(", ") }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
