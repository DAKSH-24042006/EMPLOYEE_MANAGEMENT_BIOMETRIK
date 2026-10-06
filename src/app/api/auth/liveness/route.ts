import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { image } = await req.json(); // image is base64 string

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Convert base64 to Blob
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    // Call external Liveness API
    const livenessUrl = process.env.LIVENESS_API_URL || "http://13.234.194.181:3536/liveness";
    const livenessKey = process.env.LIVENESS_API_KEY || "";
    const threshold = parseFloat(process.env.LIVENESS_THRESHOLD || "0.95");

    const res = await fetch(livenessUrl, {
      method: "POST",
      headers: {
        "x-api-key": livenessKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image_base64: base64Data }),
    });

    if (!res.ok) {
      console.error("Liveness API Error Response:", await res.text());
      return NextResponse.json(
        { verified: false, error: "Liveness check failed on server" },
        { status: res.status }
      );
    }

    const data = await res.json();

    // API returns: {"faces_detected":0,"liveness_scores":[],"results":[]}
    if (data.faces_detected > 0) {
      const score = data.liveness_scores[0] || 0;
      const result = data.results[0] || ""; // e.g. "real" or "spoof"

      const isLive = score >= threshold && result !== "spoof";

      if (isLive) {
        return NextResponse.json({ verified: true, score });
      } else {
        return NextResponse.json(
          { verified: false, score, error: "Liveness verification failed. Please try again." },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { verified: false, error: "No face detected. Please look at the camera." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Liveness API Route Error:", error);
    return NextResponse.json({ verified: false, error: "Internal server error" }, { status: 500 });
  }
}
