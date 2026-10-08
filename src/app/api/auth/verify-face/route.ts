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
    const cleanBase64 = (str: string) => {
      if (!str) return "";
      const commaIndex = str.indexOf(",");
      return commaIndex !== -1 ? str.slice(commaIndex + 1).trim() : str.trim();
    };

    const isBase64 = (str: string) => {
      const cleaned = cleanBase64(str);
      // Valid camera base64 JPEG image has at least 500 characters
      return cleaned.length > 500;
    };

    const userFaceRaw =
      user.faceData && isBase64(user.faceData)
        ? user.faceData
        : user.profilePhoto && isBase64(user.profilePhoto)
          ? user.profilePhoto
          : "";
    const isUserRegistered = isBase64(userFaceRaw);

    if (!isUserRegistered) {
      return NextResponse.json(
        { requiresRegistration: true, error: "Face not registered for this email." },
        { status: 403 }
      );
    }

    const base64Data = cleanBase64(image);
    const userFaceBase64 = cleanBase64(userFaceRaw);

    if (!isBase64(base64Data)) {
      return NextResponse.json(
        { error: "Invalid face image captured. Please look at the camera and try again." },
        { status: 400 }
      );
    }

    // Support all possible environment variable naming configurations from .env
    const faceApiUrl =
      process.env.FACE_MATCH_API_URL ||
      process.env.FACE_SEARCH_API_URL ||
      process.env.FACE_SERVER_URL ||
      "http://3.7.8.49:8000/api/v1/verification/verify";

    const faceApiKey =
      process.env.FACE_MATCH_API_KEY ||
      process.env.FACEMATCH_API_KEY ||
      process.env.FACE_API_KEY ||
      process.env.FACE_SEARCH_API_KEY ||
      "00000000-0000-0000-0000-000000000004";

    const rawThreshold = parseFloat(process.env.FACE_MATCH_THRESHOLD || "0.6");
    const threshold = isNaN(rawThreshold) ? 0.6 : rawThreshold;

    let faceVerified = false;
    let failureReason = "Face authentication failed. Face does not match.";

    try {
      console.log(`[Verify-Face] Calling Face Match API: ${faceApiUrl}`);
      const res = await fetch(faceApiUrl, {
        method: "POST",
        headers: {
          "x-api-key": faceApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // CompreFace expects snake_case:
          source_image: userFaceBase64,
          target_image: base64Data,
          // Custom/microservice backends expect camelCase:
          sourceImageBase64: userFaceBase64,
          targetImageBase64: base64Data,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[Verify-Face] Response data:", JSON.stringify(data));

        let similarity = 0;
        let matchFound = false;

        // CompreFace structure: { result: [ { face_matches: [ { similarity: 0.98 } ] } ] }
        if (Array.isArray(data.result) && data.result.length > 0) {
          const firstResult = data.result[0];
          if (Array.isArray(firstResult.face_matches) && firstResult.face_matches.length > 0) {
            similarity = firstResult.face_matches[0].similarity ?? 0;
            matchFound = similarity >= threshold;
          } else {
            console.log("[Verify-Face] No matching faces found in CompreFace result array.");
            matchFound = false;
          }
        } else if (typeof data.similarity === "number") {
          similarity = data.similarity;
          matchFound = similarity >= threshold;
        } else if (typeof data.score === "number") {
          similarity = data.score;
          matchFound = similarity >= threshold;
        } else if (data.match === true || data.is_match === true) {
          matchFound = true;
        } else if (data.match === false || data.is_match === false || data.face_found === false) {
          matchFound = false;
        }

        console.log(
          `[Verify-Face] matchFound: ${matchFound}, similarity: ${similarity}, threshold: ${threshold}`
        );
        faceVerified = matchFound;
      } else {
        const errText = await res.text();
        console.error(`[Verify-Face] API Error (${res.status}):`, errText);
        try {
          const parsed = JSON.parse(errText);
          if (parsed.message) {
            if (parsed.code === 28 || parsed.message.toLowerCase().includes("no face")) {
              failureReason =
                "No face detected in the captured camera frame. Please look directly at the camera.";
            } else {
              failureReason = parsed.message;
            }
          }
        } catch {
          // not JSON
        }
        faceVerified = false;
      }
    } catch (err: any) {
      console.error("[Verify-Face] Call Exception:", err);
      failureReason = "Failed to communicate with Face Verification server.";
      faceVerified = false;
    }

    if (!faceVerified) {
      return NextResponse.json({ error: failureReason }, { status: 401 });
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
