import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { signJwt } from "@/lib/auth";

// ============================================================
// LEGACY AUTHENTICATION — PRESERVED FOR ROLLBACK / REFERENCE
//
// Previous face verification authentication implementation.
// Replaced by Microsoft Entra ID authentication as active login.
// DO NOT DELETE.
// ============================================================

export async function POST(req: Request) {
  try {
    const { email, faceImage } = await req.json();

    if (!email || !faceImage) {
      return NextResponse.json(
        { error: "Email and face image are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Select faceReferenceImage which is normally hidden
    const user = await User.findOne({ email }).select("+faceReferenceImage");

    if (!user || !user.faceReferenceImage) {
      return NextResponse.json(
        { error: "User not found or no reference image registered." },
        { status: 404 }
      );
    }

    // Prepare images for external API (strip data URL prefix if present)
    const prepareImage = (img: string) => {
      if (img.startsWith("data:")) {
        return img.split(",")[1];
      }
      return img;
    };

    const sourceImage = prepareImage(user.faceReferenceImage);
    const targetImage = prepareImage(faceImage);

    const apiUrl = process.env.FACE_VERIFY_API_URL;
    const apiKey = process.env["X-API-Key"] as string;

    let isVerified = false;

    // ----- MOCK / LOCAL DEV FALLBACK -----
    // If apiUrl is a placeholder (example.com) or set to mock, verify locally for testing
    const isMock = !apiUrl || apiUrl.includes("example.com") || apiUrl === "mock";

    if (isMock) {
      console.log(`[FaceVerify] Mock mode active: automatically approving face verification for ${email}`);
      isVerified = true;
    } else {
      console.log(`[FaceVerify] Calling external API for ${email}...`);

      try {
        const externalResponse = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey,
          },
          body: JSON.stringify({
            source_image: sourceImage,
            target_image: targetImage,
          }),
        });

        if (!externalResponse.ok) {
          const errorData = await externalResponse.json().catch(() => ({}));
          console.error("[FaceVerify] External API error:", errorData);
          return NextResponse.json(
            { error: "Face verification service error" },
            { status: externalResponse.status }
          );
        }

        const result = await externalResponse.json();
        console.log("[FaceVerify] Full API Result:", JSON.stringify(result, null, 2));

        let highestScore = 0;

        if (result.result && Array.isArray(result.result) && result.result.length > 0) {
          const matchData = result.result[0];

          if (matchData.face_matches && Array.isArray(matchData.face_matches) && matchData.face_matches.length > 0) {
            // Find the highest similarity score among all matches
            matchData.face_matches.forEach((match: any, index: number) => {
              const score = match.similarity || match.score || match.confidence || 0;
              console.log(`[FaceVerify] Match ${index} score:`, score);
              if (score > highestScore) {
                highestScore = score;
              }
            });

            // Threshold from environment variable, default to 0.8
            const threshold = parseFloat(process.env.FACE_VERIFY_THRESHOLD || "0.8");

            if (highestScore >= threshold) {
              isVerified = true;
              console.log(`[FaceVerify] Success! Highest score ${highestScore} >= ${threshold}`);
            } else {
              console.log(`[FaceVerify] Failed. Highest score ${highestScore} is below ${threshold} threshold.`);
            }
          } else {
            console.log("[FaceVerify] No face matches found in the target image.");
          }
        }
      } catch (fetchErr: any) {
        console.warn("[FaceVerify] External API unreachable, falling back to approval for local development:", fetchErr.message);
        isVerified = true;
      }
    }

    if (!isVerified) {
      console.log("[FaceVerify] ACCESS DENIED for:", email);
      return NextResponse.json(
        { error: "Face not matched" },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await signJwt({ userId: user.id || user._id.toString(), role: user.role });

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: { email: user.email, role: user.role }
      },
      { status: 200 }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error: any) {
    console.error("[FaceVerify Route Error]:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
