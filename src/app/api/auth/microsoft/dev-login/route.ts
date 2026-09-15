import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Role, UserStatus } from "@/lib/constants";
import { signJwt } from "@/lib/auth";

/**
 * DEVELOPMENT / TESTING SIMULATION ROUTE
 * 
 * Simulates a verified Microsoft Entra ID callback for local development
 * and automated test verification.
 * Enforces the EXACT same authorization rules as the production callback:
 * 1. Checks SYSTEM_ADMIN_EMAIL bootstrap
 * 2. Queries database for user
 * 3. Rejects unregistered users (NO AUTO-CREATION)
 * 4. Rejects inactive users
 * 5. Issues JWT token and determines redirect (/admin vs /dashboard)
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    const normalizedEmail = (email || "").toLowerCase().trim();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await dbConnect();

    // 1. System Admin bootstrap check
    const systemAdminEmail = (process.env.SYSTEM_ADMIN_EMAIL || "").toLowerCase().trim();
    if (systemAdminEmail && normalizedEmail === systemAdminEmail) {
      let adminUser = await User.findOne({
        $or: [{ email: normalizedEmail }, { microsoftEmail: normalizedEmail }],
      });

      if (!adminUser) {
        console.log(`[Dev Auth] Bootstrapping System Admin: ${normalizedEmail}`);
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

    // 2. Application Authorization Check
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

    // 3. Issue session JWT
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
      secure: process.env.NODE_ENV === "production",
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
