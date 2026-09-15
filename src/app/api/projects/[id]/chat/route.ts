import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { ChatMessage } from "@/lib/models/ChatMessage";
import { Notification } from "@/lib/models/Notification";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    await dbConnect();

    const messages = await ChatMessage.find({ projectId: id })
      .populate("senderId", "name email role")
      .populate("mentions", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Return in chronological order for UI display
    return NextResponse.json({ data: messages.reverse() }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await req.json();
    const { message, attachments, mentions } = body;

    if (!message && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: "Cannot send empty message" }, { status: 400 });
    }

    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Save chat message
    const chatMsg = await ChatMessage.create({
      projectId: id,
      senderId: payload.userId,
      message: message || "",
      attachments: attachments || [],
      mentions: mentions || [],
    });

    // Send notifications to mentioned users
    if (mentions && mentions.length > 0) {
      for (const mentionedId of mentions) {
        if (mentionedId !== payload.userId) { // Don't notify self
          await Notification.create({
            recipientId: mentionedId,
            projectId: id,
            type: "CHAT_MENTION",
            title: "Tagged in Chat",
            message: `You were mentioned in a chat message by a team member for project "${project.title || "Project"}".`,
          });
        }
      }
    }

    // If the sender is not project creator, notify the creator
    if (project.createdBy && project.createdBy.toString() !== payload.userId) {
      await Notification.create({
        recipientId: project.createdBy,
        projectId: id,
        type: "CHAT_MESSAGE",
        title: "New Message in Project Chat",
        message: `New message posted in chat for project "${project.title || "Project"}".`,
      });
    }

    const populatedMsg = await ChatMessage.findById(chatMsg._id)
      .populate("senderId", "name email role")
      .populate("mentions", "name email role");

    return NextResponse.json({ data: populatedMsg }, { status: 201 });
  } catch (error: any) {
    console.error("Post message error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
