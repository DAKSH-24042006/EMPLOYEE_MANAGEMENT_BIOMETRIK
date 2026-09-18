import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/auth";
import { Role } from "@/lib/constants";

export interface AuthPayload {
  userId: string;
  role: string;
  email?: string;
  [key: string]: any;
}

/**
 * Standardized API Route Authentication Helper
 *
 * Verifies the JWT token from request cookies.
 * Returns the decoded AuthPayload on success, or a 401 NextResponse on failure.
 */
export async function requireAuth(): Promise<AuthPayload | NextResponse> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyJwt(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  return payload as AuthPayload;
}

/**
 * Standardized Role-Based Access Control Helper
 *
 * Verifies that the authenticated payload role matches one of the allowed roles.
 * Returns null if allowed, or a 403 NextResponse on failure.
 */
export function requireRole(
  payload: AuthPayload,
  allowedRoles: (string | Role)[]
): NextResponse | null {
  const isAllowed = allowedRoles.some(
    (r) =>
      r === payload.role ||
      ((r === Role.SYSTEM_ADMIN || r === "SYSTEM_ADMIN") && payload.role === "ADMIN")
  );

  if (!isAllowed) {
    return NextResponse.json(
      { error: "Forbidden: Insufficient privileges" },
      { status: 403 }
    );
  }

  return null;
}
