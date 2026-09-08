import mongoose, { Document, Model, Schema } from "mongoose";

export interface ISprint extends Document {
  projectId: mongoose.Types.ObjectId;
  name: string;
  goal?: string;
  startDate: Date;
  endDate: Date;
  status: "Planned" | "Active" | "Completed" | "Cancelled";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SprintSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Sprint name is required"],
      trim: true,
    },
    goal: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    status: {
      type: String,
      enum: ["Planned", "Active", "Completed", "Cancelled"],
      default: "Planned",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

SprintSchema.index({ projectId: 1, status: 1 });

export const Sprint: Model<ISprint> =
  mongoose.models.Sprint ||
  mongoose.model<ISprint>("Sprint", SprintSchema);
