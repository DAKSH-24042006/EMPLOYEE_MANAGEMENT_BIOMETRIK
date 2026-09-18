import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Role, UserStatus } from "@/lib/constants";
import { signJwt } from "@/lib/auth";

/**
 * DEVELOPMENT / TESTING SIMULATION ROUTE
 * 
 * Strictly disabled in production. Requires DEV_LOGIN_SECRET in dev/testing.
 */
export async function POST(req: Request) {
  // 1. Strict production gate: Route 404s completely in production
  if ((process.env.NODE_ENV as string) === "production") {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const expectedSecret = process.env.DEV_LOGIN_SECRET;
    if (!expectedSecret) {
      return NextResponse.json(
        { error: "DEV_LOGIN_SECRET is not configured on this server" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email } = body;
    const headerSecret = req.headers.get("x-dev-login-secret");
    const bodySecret = body.secret;
    const providedSecret = headerSecret || bodySecret;

    if (!providedSecret) {
      return NextResponse.json(
        { error: "Dev login secret required" },
        { status: 401 }
      );
    }

    const bufProvided = Buffer.from(String(providedSecret));
    const bufExpected = Buffer.from(String(expectedSecret));

    if (
      bufProvided.length !== bufExpected.length ||
      !crypto.timingSafeEqual(bufProvided, bufExpected)
    ) {
      return NextResponse.json(
        { error: "Invalid dev login secret" },
        { status: 403 }
      );
    }

    const normalizedEmail = (email || "").toLowerCase().trim();
    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await dbConnect();

    // 2. System Admin bootstrap check
    const systemAdminEmail = (process.env.SYSTEM_ADMIN_EMAIL || "").toLowerCase().trim();
    if (systemAdminEmail && normalizedEmail === systemAdminEmail) {
      let adminUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { microsoftEmail: normalizedEmail }],
      });

      if (!adminUser) {
        adminUser = await User.create({
          name: "System Administrator",
          email: normalizedEmail,
          microsoftEmail: normalizedEmail,
          role: Role.SYSTEM_ADMIN,
          status: UserStatus.ACTIVE,
          designation: "System Administrator",
        });
      } else {
        if (adminUser.role !== Role.SYSTEM_ADMIN || adminUser.status !== UserStatus.ACTIVE) {
          adminUser.role = Role.SYSTEM_ADMIN;
          adminUser.status = UserStatus.ACTIVE;
          await adminUser.save();
        }
      }
    }

    // 3. Application Authorization Check
    const user = await User.findOne({
      $or: [{ email: normalizedEmail }, { microsoftEmail: normalizedEmail }],
    });

    // CRITICAL: DO NOT AUTO-CREATE USERS!
    if (!user) {
      return NextResponse.json(
        {
          error: "not_registered",
          message:
            "Your Microsoft account is not registered for this application. Please contact the System Administrator.",
        },
        { status: 403 }
      );
    }

    // Check if account is ACTIVE
    if (user.status === UserStatus.INACTIVE) {
      return NextResponse.json(
        {
          error: "inactive",
          message:
            "Your account is currently inactive. Please contact the System Administrator.",
        },
        { status: 403 }
      );
    }

    // 4. Issue session JWT
    const token = await signJwt({
      userId: user._id.toString(),
      role: user.role,
    });

    const redirectPath = user.role === Role.SYSTEM_ADMIN ? "/admin" : "/dashboard";

    const response = NextResponse.json(
      {
        success: true,
        redirect: redirectPath,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          designation: user.designation,
        },
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false, // Dev-only route (production always 404s above)
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error: any) {
    console.error("[Dev Auth Error]:", error);
    return NextResponse.json(
      { error: "internal_error", message: error.message },
      { status: 500 }
    );
  }
}
