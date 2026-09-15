import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Role, UserStatus } from "@/lib/constants";
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

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return false;

  const decoded = await verifyJwt(token);
  return !!(decoded && decoded.userId);
}

// GET /api/users
export async function GET() {
  try {
    if (!(await isAuthenticated())) {
      return NextResponse.json({ error: "Unauthorized: Session required" }, { status: 401 });
    }

    await dbConnect();
    const users = await User.find({})
      .select("-password -faceReferenceImage")
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/users — Add Employee with Username and Password (SYSTEM_ADMIN ONLY)
export async function POST(req: Request) {
  try {
    if (!(await isSystemAdmin())) {
      return NextResponse.json(
        { error: "Unauthorized: System Admin access required" },
        { status: 403 }
      );
    }

    const { name, username, password, email, designation, role, status } = await req.json();

    const normalizedEmail = (email || "").toLowerCase().trim();
    const normalizedUsername = (username || "").toLowerCase().trim();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!normalizedUsername) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (!password || password.trim().length < 1) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if username is already in use
    const usernameExists = await User.findOne({ username: normalizedUsername });
    if (usernameExists) {
      return NextResponse.json(
        { error: `Username '${normalizedUsername}' is already taken. Please choose another.` },
        { status: 400 }
      );
    }

    // Check if email is already in use
    const emailExists = await User.findOne({
      $or: [{ email: normalizedEmail }, { microsoftEmail: normalizedEmail }],
    });

    if (emailExists) {
      return NextResponse.json(
        { error: `An employee with email '${normalizedEmail}' already exists.` },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await User.create({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      microsoftEmail: normalizedEmail,
      password: hashedPassword,
      designation: (designation || "").trim(),
      role: role || Role.SYSTEM_ADMIN,
      status: status || UserStatus.ACTIVE,
    });

    const userResponse = await User.findById(employee._id).select("-password -faceReferenceImage");

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error: any) {
    console.error("Create Employee Error:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: Object.values(error.errors).map((err: any) => err.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
