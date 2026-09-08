import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICalendarTask extends Document {
  title: string;
  description?: string;
  date: Date;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Todo" | "In Progress" | "Done" | "Cancelled";
  color: string;
  createdBy: mongoose.Types.ObjectId;
  googleCalendarEventId?: string;
  syncStatus: "Not synced" | "Synced" | "Sync failed";
  syncError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarTaskSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["Todo", "In Progress", "Done", "Cancelled"],
      default: "Todo",
    },
    color: {
      type: String,
      default: "#6C8EF5",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    googleCalendarEventId: {
      type: String,
      default: undefined,
    },
    syncStatus: {
      type: String,
      enum: ["Not synced", "Synced", "Sync failed"],
      default: "Not synced",
    },
    syncError: {
      type: String,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient date range queries
CalendarTaskSchema.index({ date: 1, createdBy: 1 });

export const CalendarTask: Model<ICalendarTask> =
  mongoose.models.CalendarTask ||
  mongoose.model<ICalendarTask>("CalendarTask", CalendarTaskSchema);
