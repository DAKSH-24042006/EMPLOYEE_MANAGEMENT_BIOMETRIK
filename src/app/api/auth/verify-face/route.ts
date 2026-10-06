import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { signJwt } from "@/lib/auth";
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
      return NextResponse.json({ error: "Account not found for this email." }, { status: 401 });
    }

    // Check account status
    if (user.status === UserStatus.INACTIVE) {
      return NextResponse.json(
        { error: "Your account is currently inactive. Please contact the System Administrator." },
        { status: 403 }
      );
    }

    // Face Verification Logic
    // Convert base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const faceApiUrl = process.env.FACE_SEARCH_API_URL || process.env.FACE_MATCH_API_URL || "";
    const faceApiKey = process.env.FACE_SEARCH_API_KEY || process.env.FACEMATCH_API_KEY || "";

    // Defaulting to success if APIs are not reachable in dev or for the sake of the plan
    let faceVerified = true;

    try {
      const res = await fetch(faceApiUrl, {
        method: "POST",
        headers: {
          "x-api-key": faceApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_base64: base64Data }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("Face API Response:", data);
        if (data.face_found === false) {
          faceVerified = false;
        } else {
          faceVerified = true;
        }
      } else {
        console.error("Face API Error:", await res.text());
        faceVerified = false; // Set to true if you want to bypass during testing
      }
    } catch (err) {
      console.error("Face API Call Error:", err);
      // fallback for dev mode or let it fail
      faceVerified = false;
    }

    if (!faceVerified) {
      return NextResponse.json(
        { error: "Face authentication failed. Face does not match." },
        { status: 401 }
      );
    }

    // Authentication Successful, Generate JWT Session Token
    const token = await signJwt({
      userId: user._id.toString(),
      role: user.role,
    });

    console.log(`[Verify-Face API] Login successful for user: ${user.username || user.email}`);

    const redirectPath = "/dashboard";

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        redirect: redirectPath,
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error("Verify-Face API Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
