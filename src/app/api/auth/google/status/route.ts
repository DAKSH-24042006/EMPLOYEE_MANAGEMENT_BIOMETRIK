import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { GoogleToken } from "@/lib/models/GoogleToken";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    await dbConnect();

    const tokenDoc = await GoogleToken.findOne({ userId: payload.userId });

    if (!tokenDoc) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      email: tokenDoc.email || "Unknown",
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
