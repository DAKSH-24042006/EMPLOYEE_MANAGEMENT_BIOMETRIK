import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { CalendarTask } from "@/lib/models/CalendarTask";
import { verifyJwt } from "@/lib/auth";

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

    const newTask = await CalendarTask.create({
      ...body,
      createdBy: payload.userId,
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error("POST Calendar Task Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create calendar task" },
      { status: 500 }
    );
  }
}
