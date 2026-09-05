import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyJwt(token);
  if (!payload?.userId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const clientID = process.env.GOOGLE_CLIENT_ID || "";
  const redirectURI = process.env.GOOGLE_REDIRECT_URI || "";

  if (!clientID || !redirectURI) {
    return NextResponse.json(
      { error: "Google Calendar Integration is not configured in .env" },
      { status: 500 }
    );
  }

  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"
  );
  
  // State holds the user's JWT token for callbacks to authenticate
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientID}&redirect_uri=${encodeURIComponent(
    redirectURI
  )}&scope=${scope}&access_type=offline&prompt=consent&state=${token}`;

  return NextResponse.redirect(googleAuthUrl);
}
