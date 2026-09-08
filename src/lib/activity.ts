import dbConnect from "@/lib/db";
import { ProjectActivity } from "@/lib/models/ProjectActivity";
import mongoose from "mongoose";

export async function logActivity(
  projectId: string | mongoose.Types.ObjectId,
  type: string,
  description: string,
  performedBy: string | mongoose.Types.ObjectId
) {
  try {
    await dbConnect();
    await ProjectActivity.create({
      projectId: new mongoose.Types.ObjectId(projectId.toString()),
      type,
      description,
      performedBy: new mongoose.Types.ObjectId(performedBy.toString()),
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
}
