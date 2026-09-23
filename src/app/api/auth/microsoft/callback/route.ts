import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { Role, UserStatus } from "@/lib/constants";
import { signJwt } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const loginUrl = new URL("/auth/login", appUrl);

  if (errorParam) {
    console.error("[Microsoft Callback] OAuth error from Microsoft:", errorParam, errorDescription);
    loginUrl.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(loginUrl);
  }

  if (!code) {
    console.error("[Microsoft Callback] No authorization code received");
    loginUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("ms_auth_state")?.value;

  if (!storedState || storedState !== state) {
    console.error("[Microsoft Callback] State validation failed. Possible CSRF.");
    loginUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

    if (!clientId || !clientSecret) {
      console.error("[Microsoft Callback] Missing client credentials in environment");
      loginUrl.searchParams.set("error", "config_missing");
      return NextResponse.redirect(loginUrl);
    }

    // 1. Exchange authorization code for tokens
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("[Microsoft Callback] Token exchange failed:", tokenResponse.status, errText);
      loginUrl.searchParams.set("error", "token_exchange_failed");
      return NextResponse.redirect(loginUrl);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated user profile from Microsoft Graph API
    const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!profileResponse.ok) {
      console.error("[Microsoft Callback] Failed to fetch profile from Graph API");
      loginUrl.searchParams.set("error", "profile_fetch_failed");
      return NextResponse.redirect(loginUrl);
    }

    const profile = await profileResponse.json();
    const microsoftEmail = (
      profile.mail ||
      profile.userPrincipalName ||
      ""
    ).toLowerCase().trim();
    const displayName = profile.displayName || profile.givenName || microsoftEmail;
    const microsoftId = profile.id;

    if (!microsoftEmail) {
      console.error("[Microsoft Callback] Microsoft account has no associated email address");
      loginUrl.searchParams.set("error", "no_email");
      return NextResponse.redirect(loginUrl);
    }

    await dbConnect();

    // 3. System Admin bootstrap check from environment configuration
    const systemAdminEmail = (process.env.SYSTEM_ADMIN_EMAIL || "").toLowerCase().trim();
    if (systemAdminEmail && microsoftEmail === systemAdminEmail) {
      let adminUser = await User.findOne({
        $or: [{ email: microsoftEmail }, { microsoftEmail: microsoftEmail }],
      });

      if (!adminUser) {
        console.log(`[Microsoft Auth] Bootstrapping initial System Admin: ${microsoftEmail}`);
        adminUser = await User.create({
          name: displayName || "System Admin",
          email: microsoftEmail,
          microsoftEmail: microsoftEmail,
          microsoftId: microsoftId,
          role: Role.SYSTEM_ADMIN,
          status: UserStatus.ACTIVE,
          designation: "System Administrator",
        });
      } else {
        // Ensure user is SYSTEM_ADMIN and ACTIVE
        let updated = false;
        if (adminUser.role !== Role.SYSTEM_ADMIN) {
          adminUser.role = Role.SYSTEM_ADMIN;
          updated = true;
        }
        if (adminUser.status !== UserStatus.ACTIVE) {
          adminUser.status = UserStatus.ACTIVE;
          updated = true;
        }
        if (!adminUser.microsoftEmail) {
          adminUser.microsoftEmail = microsoftEmail;
          updated = true;
        }
        if (!adminUser.microsoftId && microsoftId) {
          adminUser.microsoftId = microsoftId;
          updated = true;
        }
        if (updated) {
          await adminUser.save();
        }
      }
    }

    // 4. Application Authorization Check
    const user = await User.findOne({
      $or: [{ email: microsoftEmail }, { microsoftEmail: microsoftEmail }],
    });

    // CRITICAL: DO NOT AUTO-CREATE USERS!
    if (!user) {
      console.warn(`[Microsoft Auth] Authorization DENIED - User not registered: ${microsoftEmail}`);
      loginUrl.searchParams.set("error", "not_registered");
      return NextResponse.redirect(loginUrl);
    }

    // Check if account is ACTIVE
    if (user.status === UserStatus.INACTIVE) {
      console.warn(`[Microsoft Auth] Authorization DENIED - Account is INACTIVE: ${microsoftEmail}`);
      loginUrl.searchParams.set("error", "inactive");
      return NextResponse.redirect(loginUrl);
    }

    // Update Microsoft ID and Microsoft Email if not present
    if (!user.microsoftId && microsoftId) {
      user.microsoftId = microsoftId;
      user.microsoftEmail = microsoftEmail;
      await user.save();
    }

    // 5. Generate Application Session JWT
    const token = await signJwt({
      userId: user._id.toString(),
      role: user.role,
    });

    // 6. Redirect based on role: SYSTEM_ADMIN -> /admin, EMPLOYEE -> /dashboard
    const redirectPath = user.role === Role.SYSTEM_ADMIN ? "/admin" : "/dashboard";
    const destinationUrl = new URL(redirectPath, appUrl);

    const response = NextResponse.redirect(destinationUrl);

    // Set application session cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Clear the CSRF state cookie
    response.cookies.set("ms_auth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
    });

    console.log(`[Microsoft Auth] Login SUCCESS: ${microsoftEmail} (${user.role}) -> ${redirectPath}`);
    return response;
  } catch (error: any) {
    console.error("[Microsoft Callback Route Exception]:", error);
    loginUrl.searchParams.set("error", "auth_exception");
    return NextResponse.redirect(loginUrl);
  }
}
