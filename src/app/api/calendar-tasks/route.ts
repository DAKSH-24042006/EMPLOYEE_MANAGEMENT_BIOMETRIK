import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { CalendarTask } from "@/lib/models/CalendarTask";
import { verifyJwt } from "@/lib/auth";

import { GoogleToken } from "@/lib/models/GoogleToken";
import { createCalendarEvent } from "@/lib/googleCalendar";

export async function GET(req: Request) {
  try {
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

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query: any = { createdBy: payload.userId };

    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);

      if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
        query.date = {
          $gte: sDate,
          $lte: eDate,
        };
      } else {
        console.warn("GET Calendar Tasks: Invalid date range provided", { startDate, endDate });
      }
    }

    console.log("GET Calendar Tasks Query:", query);
    const tasks = await CalendarTask.find(query).sort({ date: 1, createdAt: 1 });
    console.log(`GET Calendar Tasks Success: Found ${tasks.length} tasks`);

    return NextResponse.json(tasks);
  } catch (error: any) {
    console.error("GET Calendar Tasks Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
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

    const hasGoogleToken = await GoogleToken.findOne({ userId: payload.userId });
    const shouldSync = !!hasGoogleToken;

    const newTask = new CalendarTask({
      ...body,
      createdBy: payload.userId,
      syncStatus: "Not synced",
    });

    if (shouldSync) {
      const origin = req.headers.get("origin") || "http://localhost:3000";
      const dashboardUrl = `${origin}/calendar`;
      const statusPrefix = body.status === "Done" ? "[COMPLETED] " : body.status === "Cancelled" ? "[CANCELLED] " : "";
      const summary = `${statusPrefix}Task: ${body.title}`;
      const desc = body.description || "No description provided.";

      try {
        const eventId = await createCalendarEvent(payload.userId, {
          summary,
          description: desc,
          dueDate: new Date(body.date),
          dashboardUrl,
        });

        if (eventId) {
          newTask.googleCalendarEventId = eventId;
          newTask.syncStatus = "Synced";
        } else {
          newTask.syncStatus = "Sync failed";
          newTask.syncError = "Failed to create Google calendar event";
        }
      } catch (syncErr: any) {
        console.error("Google Calendar Sync Error:", syncErr);
        newTask.syncStatus = "Sync failed";
        newTask.syncError = syncErr.message || "Failed to create Google calendar event";
      }
    }

    await newTask.save();
    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error("POST Calendar Task Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create calendar task" },
      { status: 500 }
    );
  }
}
