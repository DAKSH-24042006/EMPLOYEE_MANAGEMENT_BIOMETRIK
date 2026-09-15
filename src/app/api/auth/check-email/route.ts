import { NextResponse } from "next/server";

// ============================================================
// LEGACY AUTHENTICATION — COMMENTED OUT
//
// Previous authentication implementation.
// Replaced by Microsoft Entra ID authentication.
//
// PRESERVED FOR ROLLBACK / REFERENCE.
// DO NOT DELETE.
// ============================================================

/*
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email }).select("+faceReferenceImage");

    if (!user) {
      return NextResponse.json(
        { exists: false, hasFace: false },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        exists: true, 
        hasFace: !!user.faceReferenceImage,
        nextStep: user.faceReferenceImage ? "verify-face" : "register-face"
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
*/

export async function POST() {
  return NextResponse.json(
    {
      error: "Legacy check-email is disabled.",
      message: "Please sign in using Microsoft Entra ID authentication.",
    },
    { status: 403 }
  );
}

