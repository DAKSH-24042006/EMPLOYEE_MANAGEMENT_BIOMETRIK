import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Project, FEATURE_KEYS } from "@/lib/models/Project";
import { cookies } from "next/headers";
import { verifyJwt } from "@/lib/auth";

async function getAuthPayload() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  const payload = await verifyJwt(token);
  return payload?.userId ? payload : null;
}

// PATCH — update status only
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["Pending", "Active", "Completed"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    await dbConnect();
    const updated = await Project.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PUT — full project update
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const data = await req.json();

    if (!data.companyName || !data.email) {
      return NextResponse.json({ error: "Company Name and Email are required." }, { status: 400 });
    }
    if (!data.timeline?.[0] || !data.timeline?.[1]) {
      return NextResponse.json({ error: "A valid timeline is required." }, { status: 400 });
    }

    const updatePayload = {
      clientDetails: {
        companyName: data.companyName,
        contactPerson: data.contactPerson || "",
        email: data.email,
        contactNumber: data.contactNumber || "",
      },
      features: FEATURE_KEYS.reduce((acc, key) => {
        acc[key] = !!data[key];
        return acc;
      }, {} as Record<string, boolean>),
      extraAddOns: data.extraAddOns || "",
      timeline: {
        startDate: new Date(data.timeline[0]),
        endDate: new Date(data.timeline[1]),
      },
      status: data.status || "Pending",
    };

    await dbConnect();
    const updated = await Project.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
    if (!updated) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error: any) {
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: Object.values(error.errors).map((e: any) => e.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE — remove a project
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getAuthPayload();
    if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await dbConnect();

    const deleted = await Project.findByIdAndDelete(id);
    if (!deleted) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    return NextResponse.json({ message: "Project deleted successfully" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
