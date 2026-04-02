import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  // Attempt to extract the JWT token from cookies
  const tokenCookie = req.cookies.get("token");
  const token = tokenCookie?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  // Verify JWT at the Edge
  const payload = await verifyJwt(token);

  if (!payload) {
    // Invalid/Expired token
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
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
