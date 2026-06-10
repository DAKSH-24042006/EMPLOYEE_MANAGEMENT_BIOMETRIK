import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { GoogleToken } from "@/lib/models/GoogleToken";

export async function POST() {
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

    const result = await GoogleToken.findOneAndDelete({ userId: payload.userId });

    if (!result) {
      return NextResponse.json({ error: "Google Calendar connection not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Google Calendar successfully disconnected!" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
