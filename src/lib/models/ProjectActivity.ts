import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProjectActivity extends Document {
  projectId: mongoose.Types.ObjectId;
  type: string; // e.g., "sprint", "work_item", "project_status", "blocker", "test_case", "signoff", "work_log"
  description: string;
  performedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ProjectActivitySchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

ProjectActivitySchema.index({ projectId: 1, createdAt: -1 });

export const ProjectActivity: Model<IProjectActivity> =
  mongoose.models.ProjectActivity ||
  mongoose.model<IProjectActivity>("ProjectActivity", ProjectActivitySchema);
