import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { UserStatus } from "@/lib/constants";

export async function POST(req: Request) {
  try {
    const { email, image } = await req.json();

    if (!email || !image) {
      return NextResponse.json({ error: "Email and image are required" }, { status: 400 });
    }

    const lowerIdentifier = email.toLowerCase();
    const escapedIdentifier = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const caseInsensitiveRegex = new RegExp(`^${escapedIdentifier}$`, "i");

    await dbConnect();

    // Find the user
    const user = await User.findOne({
      $or: [
        { username: lowerIdentifier },
        { username: caseInsensitiveRegex },
        { email: lowerIdentifier },
        { email: caseInsensitiveRegex },
        { microsoftEmail: lowerIdentifier },
        { microsoftEmail: caseInsensitiveRegex },
      ],
    });

    if (!user) {
      return NextResponse.json({ error: "Account not found for this email." }, { status: 404 });
    }

    if (user.status === UserStatus.INACTIVE) {
      return NextResponse.json(
        { error: "Your account is currently inactive. Please contact the System Administrator." },
        { status: 403 }
      );
    }

    // Validate that image is a genuine base64 image
    const commaIndex = image.indexOf(",");
    const cleaned = (commaIndex !== -1 ? image.slice(commaIndex + 1) : image).trim();
    if (cleaned.length < 500) {
      return NextResponse.json(
        { error: "Invalid face image captured. Please look at the camera and try again." },
        { status: 400 }
      );
    }

    // Save the image as the registered face data
    user.faceData = image;
    user.profilePhoto = image;
    await user.save();

    return NextResponse.json(
      { success: true, message: "Face registered successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Register-Face API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
