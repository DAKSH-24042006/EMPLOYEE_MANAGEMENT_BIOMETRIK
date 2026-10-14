import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITask extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  dueDate: Date;
  assignedTo: mongoose.Types.ObjectId;
  assignedDate?: Date;
  syncToGoogleCalendar: boolean;
  googleCalendarEventId?: string;
  syncStatus: "Synced" | "Not synced" | "Sync failed" | "Re-sync";
  syncError?: string;
  status: "Pending" | "Completed" | "Cancelled";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
    },
    description: String,
    dueDate: {
      type: Date,
      required: [true, "Due date and time are required"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    syncToGoogleCalendar: {
      type: Boolean,
      default: false,
    },
    googleCalendarEventId: String,
    syncStatus: {
      type: String,
      enum: ["Synced", "Not synced", "Sync failed", "Re-sync"],
      default: "Not synced",
    },
    syncError: String,
    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
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

export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);
