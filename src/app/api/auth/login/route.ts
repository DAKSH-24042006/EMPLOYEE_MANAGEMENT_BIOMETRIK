import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { signJwt } from "@/lib/auth";
import { Role, UserStatus } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawIdentifier = (body.username || body.email || body.identifier || "").trim();
    const password = body.password || "";

    if (!rawIdentifier || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const lowerIdentifier = rawIdentifier.toLowerCase();
    const escapedIdentifier = rawIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const caseInsensitiveRegex = new RegExp(`^${escapedIdentifier}$`, "i");

    await dbConnect();

    // 1. Super Admin .env Fallback Check
    const envAdminUsername = (process.env.SYSTEM_ADMIN_USERNAME || "").trim();
    const envAdminEmail = (process.env.SYSTEM_ADMIN_EMAIL || "").trim();
    const envAdminPassword = process.env.SYSTEM_ADMIN_PASSWORD || "";

    const isEnvAdminLogin =
      envAdminPassword &&
      (rawIdentifier === envAdminUsername || lowerIdentifier === envAdminEmail.toLowerCase()) &&
      password === envAdminPassword;

    let user;

    if (isEnvAdminLogin) {
      // Auto-upsert the system admin to ensure they exist in DB with a valid ID
      user = await User.findOne({
        $or: [{ username: envAdminUsername }, { email: envAdminEmail }],
      }).select("+password");

      if (!user) {
        console.log("[Login API] Auto-creating System Admin from .env credentials...");
        const hashedPassword = await bcrypt.hash(envAdminPassword, 10);
        user = await User.create({
          name: "System Administrator",
          username: envAdminUsername || "admin",
          email: envAdminEmail || "admin@biometrik.in",
          password: hashedPassword,
          designation: "System Administrator",
          role: Role.SYSTEM_ADMIN,
          status: UserStatus.ACTIVE,
        });
      }
    } else {
      // 2. Normal User Database Lookup
      user = await User.findOne({
        $or: [
          { username: lowerIdentifier },
          { username: caseInsensitiveRegex },
          { email: lowerIdentifier },
          { email: caseInsensitiveRegex },
          { microsoftEmail: lowerIdentifier },
          { microsoftEmail: caseInsensitiveRegex },
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
