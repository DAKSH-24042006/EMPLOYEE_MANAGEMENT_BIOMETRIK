import dbConnect from "./db";
import { GoogleToken } from "./models/GoogleToken";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "";

/**
 * Returns a valid access token for the given user, refreshing it if necessary.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  await dbConnect();
  const tokenDoc = await GoogleToken.findOne({ userId });
  if (!tokenDoc) {
    return null;
  }

  const now = new Date();
  // If token expires in less than 5 minutes, refresh it
  if (tokenDoc.expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: tokenDoc.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to refresh Google access token", data);
        return null;
      }

      tokenDoc.accessToken = data.access_token;
      tokenDoc.expiryDate = new Date(Date.now() + data.expires_in * 1000);
      await tokenDoc.save();
    } catch (error) {
      console.error("Error refreshing Google access token", error);
      return null;
    }
  }

  return tokenDoc.accessToken;
}

/**
 * Creates a Google Calendar event and returns the event ID.
 */
export async function createCalendarEvent(
  userId: string,
  eventDetails: {
    summary: string;
    description: string;
    dueDate: Date;
    dashboardUrl?: string;
  }
): Promise<string | null> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return null;

  const start = eventDetails.dueDate;
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour event

  const body = {
    summary: eventDetails.summary,
    description: `${eventDetails.description}\n\nLink back to Dashboard: ${eventDetails.dashboardUrl || ""}`,
    start: {
      dateTime: start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "UTC",
    },
  };

  try {
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error("Failed to create Google calendar event", data);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Error creating Google calendar event", error);
    return null;
  }
}

/**
 * Updates an existing Google Calendar event.
 */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  eventDetails: {
    summary: string;
    description: string;
    dueDate: Date;
    dashboardUrl?: string;
  }
): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return false;

  const start = eventDetails.dueDate;
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const body = {
    summary: eventDetails.summary,
    description: `${eventDetails.description}\n\nLink back to Dashboard: ${eventDetails.dashboardUrl || ""}`,
    start: {
      dateTime: start.toISOString(),
      timeZone: "UTC",
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: "UTC",
    },
  };

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      console.error("Failed to update Google calendar event", data);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating Google calendar event", error);
    return false;
  }
}

/**
 * Deletes a Google Calendar event.
 */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<boolean> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return false;

  try {
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok && res.status !== 410 && res.status !== 404) {
      const data = await res.json();
      console.error("Failed to delete Google calendar event", data);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting Google calendar event", error);
    return false;
  }
}
