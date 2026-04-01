import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { verifyJwt } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Get the JWT token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    // Verify JWT
    const decoded = await verifyJwt(token);

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid token" },
        { status: 401 }
      );
    }

    await dbConnect();

    // Find the user by ID and internal fields
    const user = await User.findById(decoded.userId).select("name email role phoneNumber location");

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        user: { 
          id: user._id,
          name: user.name, 
          email: user.email, 
          role: user.role,
          phoneNumber: user.phoneNumber,
          location: user.location
        } 
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Fetch Current User Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
