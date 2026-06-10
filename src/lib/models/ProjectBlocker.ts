import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProjectBlocker extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type:
    | "Client-side"
    | "Internal"
    | "Third-party"
    | "Technical"
    | "Commercial"
    | "Legal"
    | "Data"
    | "API"
    | "Hardware"
    | "Other";
  status: "Open" | "In Progress" | "Resolved" | "Cancelled";
  priority: "Low" | "Medium" | "High" | "Critical";
  ownerId: mongoose.Types.ObjectId;
  dueDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  resolutionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectBlockerSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Blocker title is required"],
    },
    description: String,
    type: {
      type: String,
      enum: [
        "Client-side",
        "Internal",
        "Third-party",
        "Technical",
        "Commercial",
        "Legal",
        "Data",
        "API",
        "Hardware",
        "Other",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved", "Cancelled"],
      default: "Open",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dueDate: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,
    resolutionNote: String,
  },
  {
    timestamps: true,
  }
);

export const ProjectBlocker: Model<IProjectBlocker> =
  mongoose.models.ProjectBlocker ||
  mongoose.model<IProjectBlocker>("ProjectBlocker", ProjectBlockerSchema);
