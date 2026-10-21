import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project } from "@/lib/models/Project";
import { ChatMessage } from "@/lib/models/ChatMessage";
import { Notification } from "@/lib/models/Notification";
import { WorkItem } from "@/lib/models/WorkItem";
import { Task } from "@/lib/models/Task";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";
import { canUserViewProject, canUserEditProject } from "@/lib/projectAccess";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    await dbConnect();

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const canChat = await canUserEditProject(project, payload.userId, payload.role);
    if (!canChat) {
      return NextResponse.json(
        { error: "Forbidden: Chat is restricted to project team members only" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const page = parseInt(searchParams.get("page") || "1");

    const messages = await ChatMessage.find({ projectId: id })
      .populate("senderId", "name email role")
      .populate("mentions", "name email role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Return in chronological order for UI display
    return NextResponse.json(
      { data: messages.reverse() },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    const canChat = await canUserEditProject(project, payload.userId, payload.role);
    if (!canChat) {
      return NextResponse.json(
        { error: "Forbidden: Chat is restricted to project team members only" },
        { status: 403 }
      );
    }

    // Save chat message
    const chatMsg = await ChatMessage.create({
      projectId: id,
      senderId: payload.userId,
      message: message || "",
      attachments: attachments || [],
      mentions: mentions || [],
    });

    // Gather all members of the project to notify them at the bell icon
    const memberSet = new Set<string>();

    if (project.createdBy) memberSet.add(project.createdBy.toString());
    if (project.techOwner) memberSet.add(project.techOwner.toString());
    if (project.productOwner) memberSet.add(project.productOwner.toString());
    if (Array.isArray(project.productOwners)) {
      project.productOwners.forEach((po: any) => {
        if (po) memberSet.add(po.toString());
      });
    }

    if (Array.isArray(project.techTeamMembers)) {
      project.techTeamMembers.forEach((m: any) => {
        if (m) memberSet.add(m.toString());
      });
    }

    // Also get assignees on project work items and tasks
    try {
      const [workItemAssignees, taskAssignees] = await Promise.all([
        WorkItem.find({ projectId: id }).distinct("assignee"),
        Task.find({ projectId: id }).distinct("assignedTo"),
      ]);
      workItemAssignees.forEach((a: any) => {
        if (a) memberSet.add(a.toString());
      });
      taskAssignees.forEach((a: any) => {
        if (a) memberSet.add(a.toString());
      });
    } catch (err) {
      console.warn("Could not query work items/tasks for chat notifications:", err);
    }

    // Include directly mentioned users
    if (Array.isArray(mentions)) {
      mentions.forEach((m: any) => {
        if (m) memberSet.add(m.toString());
      });
    }

    // Exclude the message sender (don't notify self)
    memberSet.delete(payload.userId);

    const mentionSet = new Set((mentions || []).map((m: any) => m.toString()));

    // Create or update notifications for all relevant project members
    for (const recipientId of Array.from(memberSet)) {
      const isMentioned = mentionSet.has(recipientId);
      if (isMentioned) {
        await Notification.create({
          recipientId,
          projectId: id,
          type: "CHAT_MENTION",
          title: "Tagged in Project Chat",
          message: `You were mentioned in project "${project.title || "Project"}" chat.`,
        });
      } else {
        // Consolidate general unread chat notifications to avoid notification spam
        const existingNotif = await Notification.findOne({
          recipientId,
          projectId: id,
          type: "CHAT_MESSAGE",
          read: false,
        });

        if (existingNotif) {
          const match = existingNotif.message.match(/(\d+)\s+new messages/);
          const newCount = match ? parseInt(match[1], 10) + 1 : 2;
          existingNotif.title = `Project Chat: ${project.title || "Project"}`;
          existingNotif.message = `${newCount} new messages in "${project.title || "Project"}" chat.`;
          await existingNotif.save();
        } else {
          await Notification.create({
            recipientId,
            projectId: id,
            type: "CHAT_MESSAGE",
            title: `Project Chat: ${project.title || "Project"}`,
            message: `New message posted in project "${project.title || "Project"}".`,
          });
        }
      }
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
