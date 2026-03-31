import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { CalendarTask } from "@/lib/models/CalendarTask";
import { verifyJwt } from "@/lib/auth";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

    // Ensure users can only update their own tasks
    const updatedTask = await CalendarTask.findOneAndUpdate(
      { _id: id, createdBy: payload.userId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return NextResponse.json(
        { error: "Task not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("PUT Calendar Task Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update calendar task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJwt(token);
    if (!payload?.userId) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }

    await dbConnect();

    // Ensure users can only delete their own tasks
    const deletedTask = await CalendarTask.findOneAndDelete({
      _id: id,
      createdBy: payload.userId,
    });

    if (!deletedTask) {
      return NextResponse.json(
        { error: "Task not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("DELETE Calendar Task Error:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar task" },
      { status: 500 }
    );
  }
}
