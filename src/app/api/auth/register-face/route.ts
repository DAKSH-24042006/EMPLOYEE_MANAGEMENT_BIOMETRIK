import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { signJwt } from "@/lib/auth";
import { User } from "@/lib/models/User";

// ============================================================
// LEGACY AUTHENTICATION — PRESERVED FOR ROLLBACK / REFERENCE
//
// Previous face registration authentication implementation.
// Replaced by Microsoft Entra ID authentication as active login.
// DO NOT DELETE.
// ============================================================

const MAX_FACE_IMAGE_LENGTH = 8 * 1024 * 1024;

function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidFaceImage(faceImage: unknown) {
  return (
    typeof faceImage === "string" &&
    faceImage.length > 100 &&
    faceImage.length <= MAX_FACE_IMAGE_LENGTH
  );
}

function normalizeBase64Image(image: string) {
  const dataUrlSeparator = "base64,";
  const separatorIndex = image.indexOf(dataUrlSeparator);

  if (separatorIndex >= 0) {
    return image.slice(separatorIndex + dataUrlSeparator.length);
  }

  return image;
}

function isValidLocation(location: unknown) {
  return typeof location === "string" && location.trim().length > 0;
}

function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function POST(req: Request) {
  try {
    const { email, faceImage, location } = await req.json();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isValidFaceImage(faceImage)) {
      return NextResponse.json(
        { error: "Email and face image are required" },
        { status: 400 }
      );
    }

    if (!isValidLocation(location)) {
      return NextResponse.json(
        { error: "Location permission is required to register face" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: normalizedEmail })
      .select("+faceReferenceImage");

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.faceReferenceImage) {
      return NextResponse.json(
        { error: "Face is already registered for this account" },
        { status: 409 }
      );
    }

    user.faceReferenceImage = normalizeBase64Image(faceImage);
    user.location = location.trim();
    await user.save();

    const token = await signJwt({
      userId: user.id || user._id.toString(),
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: "Face registered successfully",
        user: { email: user.email, role: user.role },
      },
      { status: 200 }
    );

    setAuthCookie(response, token);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
