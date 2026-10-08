import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "Email is required in query params: ?email=..." },
      { status: 400 }
    );
  }

  await dbConnect();

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  user.faceData = "";
  await user.save();

  return NextResponse.json({ success: true, message: `faceData cleared for ${email}` });
}
