import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { verifyJwt } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get the JWT token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    // Verify JWT
    const decoded = await verifyJwt(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    await dbConnect();

    // Find the user by ID and internal fields
    const user = await User.findById(decoded.userId).select(
      "name username email microsoftEmail designation status role phoneNumber location bio profilePhoto"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          microsoftEmail: user.microsoftEmail,
          designation: user.designation || "",
          status: user.status,
          role: user.role,
          phoneNumber: user.phoneNumber,
          location: user.location,
          bio: user.bio,
          profilePhoto: user.profilePhoto,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: unknown) {
    console.error("Fetch Current User Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
    }

    const decoded = await verifyJwt(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Unauthorized: Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phoneNumber, location, bio } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!/^[0-9]+$/.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Phone number must contain only numbers" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    user.name = name;
    user.phoneNumber = phoneNumber;
    user.location = location || "";
    user.bio = bio || "";
    await user.save();

    return NextResponse.json(
      {
        message: "Profile updated successfully",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          location: user.location,
          bio: user.bio,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update Current User Error:", error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
