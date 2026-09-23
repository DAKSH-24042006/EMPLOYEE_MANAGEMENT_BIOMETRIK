import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;

    if (!clientId || clientId.includes("your_microsoft") || clientId === "your_client_id" || clientId === "dummy") {
      // Configuration missing or placeholder
      console.warn("[Microsoft Auth] MICROSOFT_CLIENT_ID is not configured in .env.local");
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("error", "config_missing");
      return NextResponse.redirect(loginUrl);
    }

    const redirectUri = `${appUrl}/api/auth/microsoft/callback`;
    const state = crypto.randomBytes(32).toString("hex");

    const authUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
    );

    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_mode", "query");
    authUrl.searchParams.set("scope", "openid profile email User.Read");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "select_account");

    const response = NextResponse.redirect(authUrl.toString());

    response.cookies.set("ms_auth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10, // 10 minutes
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("[Microsoft Auth Initiate Error]:", error);
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("error", "init_failed");
    return NextResponse.redirect(loginUrl);
  }
}
