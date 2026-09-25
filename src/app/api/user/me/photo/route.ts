import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User } from "@/lib/models/User";
import { verifyJwt } from "@/lib/auth";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyJwt(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validation
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (!allowedMimeTypes.includes(file.type) && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }

    // Use process.cwd()/uploads/profile to avoid Next.js public caching
    const uploadDir = path.join(process.cwd(), "uploads", "profile");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize and generate unique safe filename
    const sanitizedOriginalName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const uniqueFilename = `${crypto.randomUUID()}_${sanitizedOriginalName}`;
    const filePath = path.join(uploadDir, uniqueFilename);

    // Save File
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    const profilePhotoUrl = `/api/user/photo/${uniqueFilename}`;

    await dbConnect();
    const user = await User.findById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete old photo if it exists and is stored in uploads/profile
    if (user.profilePhoto && user.profilePhoto.startsWith("/api/user/photo/")) {
      const oldFilename = user.profilePhoto.split("/").pop();
      if (oldFilename) {
        const oldFilePath = path.join(process.cwd(), "uploads", "profile", oldFilename);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (_e) {}
        }
      }
    }

    user.profilePhoto = profilePhotoUrl;
    await user.save();

    return NextResponse.json(
      { message: "Profile photo updated", profilePhoto: profilePhotoUrl },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Profile photo upload error:", error);
    const err = error as Error;
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
