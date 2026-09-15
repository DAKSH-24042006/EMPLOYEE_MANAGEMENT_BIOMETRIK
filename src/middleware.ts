import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // Extract pathname for logging
  const pathname = new URL(req.url).pathname;
  const tokenCookie = req.cookies.get("token");
  const token = tokenCookie?.value;

  console.log(`[Middleware] Path: ${pathname}, Token present: ${!!token}`);

  if (pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  if (!token) {
    console.log(`[Middleware] No token found, redirecting to login with callback: ${pathname}`);
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }


  // Verify JWT at the Edge
  const payload = await verifyJwt(token);
  console.log(`[Middleware] Token verification result: ${payload ? "Valid" : "Invalid"}`);

  if (!payload) {
    // Invalid/Expired token
    console.log(`[Middleware] Invalid token, redirecting to login`);
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce System Admin Route Protection — Strictly SYSTEM_ADMIN only
  if (pathname.startsWith("/admin") || pathname.startsWith("/projects/new")) {
    if (payload.role !== "SYSTEM_ADMIN") {
      console.warn(`[Middleware] Unauthorized attempt to access ${pathname} by role: ${payload.role}`);
      const redirectUrl = new URL("/projects", req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  console.log(`[Middleware] User authorized: ${payload.userId} (${payload.role})`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/login (our public login route)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|auth/login|\\.well-known).*)",
  ],
};
