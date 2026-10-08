import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { UserStatus } from "@/lib/constants";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get("identifier") || searchParams.get("email");

    if (!identifier) {
      return NextResponse.json({ error: "Email or username is required" }, { status: 400 });
    }

    const lowerIdentifier = identifier.toLowerCase().trim();
    const escapedIdentifier = lowerIdentifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const caseInsensitiveRegex = new RegExp(`^${escapedIdentifier}$`, "i");

    await dbConnect();

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

    const cleanBase64 = (str?: string) => {
      if (!str) return "";
      const commaIndex = str.indexOf(",");
      return commaIndex !== -1 ? str.slice(commaIndex + 1).trim() : str.trim();
    };

    const isBase64 = (str?: string) => {
      if (!str) return false;
      const cleaned = cleanBase64(str);
      return cleaned.length > 500;
    };

    const userFaceRaw: string =
      (isBase64(user.faceData) ? user.faceData : "") ||
      (isBase64(user.profilePhoto) ? user.profilePhoto : "") ||
      "";

    const isFaceRegistered = isBase64(userFaceRaw);

    return NextResponse.json(
      {
        exists: true,
        isFaceRegistered,
        name: user.name,
        email: user.email,
        username: user.username,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Face-Status API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
