import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { signJwt } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // In a real system, you'd find a user. For mocked environment, we can fallback dynamically
    // Select password since it's set to select: false by default in Schema
    let user = await User.findOne({ email }).select("+password");

    // ----- MOCK SETUP FOR DEMO PURPOSES -----
    // If the mock user doesn't exist, create an admin or sales user on the fly.
    // This allows testing the RBAC flow smoothly without a pre-seeded database.
    if (!user) {
      const isSales = email.includes("sales");
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await User.create({
        name: isSales ? "Sales Mock User" : "Admin Mock User",
        email,
        password: hashedPassword,
        role: isSales ? "SALES" : "ADMIN",
      });
    }
    // ----------------------------------------

    // Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password as string);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await signJwt({ userId: user.id || user._id.toString(), role: user.role });

    // Build the response and Set-Cookie
    const response = NextResponse.json(
      { message: "Login successful", user: { email: user.email, role: user.role } },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
