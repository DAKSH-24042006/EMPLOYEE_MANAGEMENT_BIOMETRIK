import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Notification } from "@/lib/models/Notification";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    await dbConnect();

    // Fetch unread notifications first, limit to 20
    const notifications = await Notification.find({ recipientId: payload.userId })
      .sort({ createdAt: -1 })
      .limit(30);

    return NextResponse.json({ data: notifications }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationId, markAll } = body;

    await dbConnect();

    if (markAll) {
      // Mark all read for user
      await Notification.updateMany(
        { recipientId: payload.userId, read: false },
        { read: true }
      );
      return NextResponse.json({ message: "All notifications marked as read" }, { status: 200 });
    }

    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID is required" }, { status: 400 });
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId: payload.userId },
      { read: true },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
