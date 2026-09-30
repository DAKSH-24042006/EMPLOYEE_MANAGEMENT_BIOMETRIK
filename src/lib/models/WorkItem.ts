import mongoose, { Document, Model, Schema } from "mongoose";

export interface IWorkLog {
  date: Date;
  hoursSpent: Number;
  description: string;
  loggedBy: mongoose.Types.ObjectId;
}

export interface IWorkItemComment {
  text: string;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IWorkItemAttachment {
  name: string;
  url: string;
}

export interface IWorkItem extends Document {
  projectId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: "Feature" | "Bug" | "Task" | "Chore";
  module?: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status:
    | "Backlog"
    | "To Do"
    | "In Progress"
    | "Blocked"
    | "In Review"
    | "Testing"
    | "Done"
    | "Cancelled";
  assignee?: mongoose.Types.ObjectId;
  assignees?: mongoose.Types.ObjectId[];
  sprint?: mongoose.Types.ObjectId;
  dueDate?: Date;
  lastReminderSentAt?: Date;
  lastReminderType?: "approaching" | "due_today" | "overdue";
  overdueReminderCount?: number;
  estimatedHours: number;
  actualHours: number;
  progress: number;
  workLogs: IWorkLog[];
  comments: IWorkItemComment[];
  attachments: IWorkItemAttachment[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WorkItemSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Work item title is required"],
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["Feature", "Bug", "Task", "Chore"],
      default: "Feature",
    },
    module: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: [
        "Backlog",
        "To Do",
        "In Progress",
        "Blocked",
        "In Review",
        "Testing",
        "Done",
        "Cancelled",
      ],
      default: "Backlog",
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
    },
    dueDate: Date,
    lastReminderSentAt: Date,
    lastReminderType: {
      type: String,
      enum: ["approaching", "due_today", "overdue"],
    },
    overdueReminderCount: {
      type: Number,
      default: 0,
    },
    estimatedHours: {
      type: Number,
      default: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    workLogs: [
      {
        date: { type: Date, required: true },
        hoursSpent: { type: Number, required: true },
        description: { type: String, default: "" },
        loggedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
      },
    ],
    comments: [
      {
        text: { type: String, required: true },
        author: { type: Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
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

WorkItemSchema.index({ projectId: 1, sprint: 1, assignee: 1 });

if (mongoose.models.WorkItem) {
  delete mongoose.models.WorkItem;
}

export const WorkItem: Model<IWorkItem> = mongoose.model<IWorkItem>("WorkItem", WorkItemSchema);
