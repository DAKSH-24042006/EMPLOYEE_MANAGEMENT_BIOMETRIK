import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyJwt } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const pathname = new URL(req.url).pathname;
  const tokenCookie = req.cookies.get("token");
  const token = tokenCookie?.value;

  if (pathname.startsWith("/.well-known/")) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT at the Edge
  const payload = await verifyJwt(token);

  if (!payload) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Enforce System Admin Route Protection — Strictly SYSTEM_ADMIN only
  if (pathname.startsWith("/admin") || pathname.startsWith("/projects/new")) {
    if (payload.role !== "SYSTEM_ADMIN") {
      const redirectUrl = new URL("/projects", req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|auth/login|\\.well-known).*)",
  ],
};
