import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { signJwt } from "@/lib/auth";
import { Role, UserStatus } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const identifier = (body.username || body.email || body.identifier || "").trim().toLowerCase();
    const password = body.password || "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Query user by username, email, or microsoftEmail
    let user = await User.findOne({
      $or: [
        { username: identifier },
        { email: identifier },
        { microsoftEmail: identifier },
      ],
    }).select("+password");


    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Check account status
    if (user.status === UserStatus.INACTIVE) {
      return NextResponse.json(
        { error: "Your account is currently inactive. Please contact the System Administrator." },
        { status: 403 }
      );
    }

    // Verify Password
    if (!user.password) {
      return NextResponse.json(
        { error: "Password has not been set for this account. Please contact the System Administrator." },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Generate JWT Session Token
    const token = await signJwt({
      userId: user._id.toString(),
      role: user.role,
    });

    console.log(`[Login API] Login successful for user: ${user.username || user.email} (${user.role})`);

    const redirectPath = user.role === Role.SYSTEM_ADMIN ? "/admin" : "/dashboard";

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        redirect: redirectPath,
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
