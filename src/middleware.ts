import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // Extract pathname for logging
  const pathname = new URL(req.url).pathname;
  const tokenCookie = req.cookies.get("token");
  const token = tokenCookie?.value;

  console.log(`[Middleware] Path: ${pathname}, Token present: ${!!token}`);

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

  // Optionally: Route specific Role-Based Access Control
  // e.g. if (pathname.startsWith("/requirement") && payload.role !== "ADMIN") return NextResponse.redirect("/unauthorized")

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
    "/((?!api|_next/static|_next/image|favicon.ico|auth/login).*)",
  ],
};
