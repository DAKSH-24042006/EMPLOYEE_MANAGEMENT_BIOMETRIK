import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { verifyJwt } from "@/lib/auth";
import { GoogleToken } from "@/lib/models/GoogleToken";
import { Task } from "@/lib/models/Task";
import { Project } from "@/lib/models/Project";
import { createCalendarEvent } from "@/lib/googleCalendar";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // This contains our JWT token

  if (!code || !state) {
    return NextResponse.json({ error: "Missing OAuth code or state parameter" }, { status: 400 });
  }

  // Verify JWT passed in state
  const payload = await verifyJwt(state);
  if (!payload?.userId) {
    return NextResponse.json({ error: "Invalid OAuth session state" }, { status: 401 });
  }

  const clientID = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectURI = process.env.GOOGLE_REDIRECT_URI || "";

  try {
    // Exchange Auth Code for Access & Refresh Tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectURI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(new URL("/profile?google_error=auth_failed", req.url));
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Fetch Connected User's Email Address
    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userinfo = await userinfoRes.json();

    await dbConnect();

    // Store Google OAuth Tokens securely in database
    await GoogleToken.findOneAndUpdate(
      { userId: payload.userId },
      {
        userId: payload.userId,
        accessToken: access_token,
        // Only update refresh token if present (Google only returns it on first connection/consent)
        ...(refresh_token ? { refreshToken: refresh_token } : {}),
        expiryDate: new Date(Date.now() + expires_in * 1000),
        email: userinfo.email || "",
      },
      { upsert: true, new: true }
    );

    // Retroactive sync of existing pending tasks assigned to this user
    try {
      const pendingTasks = await Task.find({
        assignedTo: payload.userId,
        status: "Pending",
        googleCalendarEventId: { $exists: false },
      });

      const origin = new URL(req.url).origin;
      for (const task of pendingTasks) {
        try {
          const project = await Project.findById(task.projectId);
          if (project) {
            const dashboardUrl = `${origin}/projects/${task.projectId}`;
            const summary = `[${project.clientDetails.companyName}] Task: ${task.title}`;
            const desc = task.description || "No description provided.";

            const eventId = await createCalendarEvent(payload.userId, {
              summary,
              description: desc,
              dueDate: task.dueDate,
              dashboardUrl,
            });

            if (eventId) {
              task.googleCalendarEventId = eventId;
              task.syncToGoogleCalendar = true;
              task.syncStatus = "Synced";
              task.syncError = undefined;
              await task.save();
            }
          }
        } catch (taskErr) {
          console.error(`Failed retroactive sync for task ${task._id}:`, taskErr);
        }
      }
    } catch (syncErr) {
      console.error("Failed to run retroactive tasks sync:", syncErr);
    }

    return NextResponse.redirect(new URL("/profile?google_connected=true", req.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/profile?google_error=server_error", req.url));
  }
}
