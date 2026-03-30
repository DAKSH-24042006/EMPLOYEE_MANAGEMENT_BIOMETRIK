import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";

// Define which routes to protect.
// Here we protect /dashboard and /requirement
const protectedPaths = ["/dashboard", "/projects", "/history"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if we strictly match a protected route
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtectedPath) {
    // Attempt to extract the JWT token from cookies
    const tokenCookie = req.cookies.get("token");
    const token = tokenCookie?.value;

    if (!token) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify JWT at the Edge
    const payload = await verifyJwt(token);

    if (!payload) {
      // Invalid/Expired token
      const loginUrl = new URL("/auth/login", req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Optionally: Route specific Role-Based Access Control
    // e.g. if (pathname.startsWith("/requirement") && payload.role !== "ADMIN") return NextResponse.redirect("/unauthorized")

    return NextResponse.next();
  }

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
