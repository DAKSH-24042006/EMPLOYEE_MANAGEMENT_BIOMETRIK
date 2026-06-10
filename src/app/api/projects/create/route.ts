import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "@/lib/db";
import { Project, FEATURE_KEYS } from "@/lib/models/Project";
import { verifyJwt } from "@/lib/auth";

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

    const data = await req.json();

    // Data restructuring to map exactly against Schema constraints
    const newProject = {
      title: data.title || "",
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
      useCase: data.useCase || "",
      targetUsers: data.targetUsers || "",
      functionalRequirements: data.functionalRequirements || "",
      nonFunctionalRequirements: data.nonFunctionalRequirements || "",
      budget: data.budget || "",
      integrations: data.integrations || "",
      priority: data.priority || "Medium",
      timeline: {
        startDate: data.startDate ? new Date(data.startDate) : (data.timeline?.[0] ? new Date(data.timeline[0]) : undefined),
        endDate: data.endDate ? new Date(data.endDate) : (data.timeline?.[1] ? new Date(data.timeline[1]) : undefined),
      },
      createdBy: payload.userId,
    };

    // Basic Validation Strategy
    if (!newProject.title) {
      return NextResponse.json(
        { error: "Project Title is required." },
        { status: 400 }
      );
    }

    if (!newProject.clientDetails.companyName || !newProject.clientDetails.email) {
      return NextResponse.json(
        { error: "Company Name and Email are required." },
        { status: 400 }
      );
    }

    if (!newProject.timeline.startDate || !newProject.timeline.endDate) {
      return NextResponse.json(
        { error: "A comprehensive Timeline is required." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Save configuration
    const reqDoc = await Project.create(newProject);

    return NextResponse.json(
      { message: "Project created successfully!", data: reqDoc },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ValidationError") {
      return NextResponse.json(
        { error: Object.values(error.errors).map((err: any) => err.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
