import mongoose, { Schema, Document, Model } from "mongoose";

export type BugSeverity = "Severe" | "High" | "Medium" | "Low";
export type BugStatus = "OPEN" | "ASSIGNED" | "FIXED" | "PASS" | "FAIL";
export type BugActionType =
  "REPORTED" | "ASSIGNED" | "REASSIGNED" | "FIXED" | "QA_PASS" | "QA_FAIL" | "UPDATED";

export interface IBugAuditEntry {
  timestamp: Date;
  performedBy: mongoose.Types.ObjectId;
  action: BugActionType;
  previousStatus?: BugStatus;
  newStatus?: BugStatus;
  previousAssignee?: mongoose.Types.ObjectId | null;
  newAssignee?: mongoose.Types.ObjectId | null;
  remarks: string; // Mandatory for every single action
  qaResult?: "PASS" | "FAIL";
}

export interface IBugAttachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface IBug extends Document {
  bugId: string; // e.g., "BUG-0001"
  projectId: mongoose.Types.ObjectId;
  title: string;
  severity: BugSeverity;
  description: string; // Enforced ~350 chars
  attachments: IBugAttachment[];

  // Ownership & Dates
  reportedBy: mongoose.Types.ObjectId;
  reportedAt: Date;
  assignee: mongoose.Types.ObjectId; // Defaults to Project Manager (techOwner)
  assignedAt?: Date;
  previousAssignee?: mongoose.Types.ObjectId | null; // Developer tracking for auto-return on QA FAIL
  qaAssignee?: mongoose.Types.ObjectId | null; // Designated QA Tester (defaults to Project Manager)

  // State Machine
  status: BugStatus;

  // Latest Remarks Snapshots
  latestReporterRemarks: string;
  latestDeveloperRemarks?: string;
  latestQARemarks?: string;
  qaOutcome?: "PASS" | "FAIL" | "PENDING";

  // Cycle Counters
  reopenCount: number;

  // Immutable Chronological Audit Trail
  auditTrail: IBugAuditEntry[];

  createdAt: Date;
  updatedAt: Date;
}

const BugAuditEntrySchema = new Schema<IBugAuditEntry>(
  {
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: ["REPORTED", "ASSIGNED", "REASSIGNED", "FIXED", "QA_PASS", "QA_FAIL", "UPDATED"],
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ["OPEN", "ASSIGNED", "FIXED", "PASS", "FAIL"],
    },
    newStatus: {
      type: String,
      enum: ["OPEN", "ASSIGNED", "FIXED", "PASS", "FAIL"],
    },
    previousAssignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    newAssignee: { type: Schema.Types.ObjectId, ref: "User", default: null },
    remarks: { type: String, required: true },
    qaResult: { type: String, enum: ["PASS", "FAIL"] },
  },
  { _id: false }
);

const BugAttachmentSchema = new Schema<IBugAttachment>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BugSchema = new Schema<IBug>(
  {
    bugId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Bug title is required"],
      trim: true,
    },
    severity: {
      type: String,
      enum: ["Severe", "High", "Medium", "Low"],
      default: "Medium",
      index: true,
    },
    description: {
      type: String,
      required: [true, "Bug description is required"],
      maxlength: [400, "Description should not exceed 350-400 characters"],
      trim: true,
    },
    attachments: [BugAttachmentSchema],

    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedAt: {
      type: Date,
    },
    previousAssignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    qaAssignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["OPEN", "ASSIGNED", "FIXED", "PASS", "FAIL"],
      default: "OPEN",
      index: true,
    },

    latestReporterRemarks: {
      type: String,
      required: true,
    },
    latestDeveloperRemarks: {
      type: String,
    },
    latestQARemarks: {
      type: String,
    },
    qaOutcome: {
      type: String,
      enum: ["PASS", "FAIL", "PENDING"],
      default: "PENDING",
    },

    reopenCount: {
      type: Number,
      default: 0,
    },

    auditTrail: [BugAuditEntrySchema],
  },
  {
    timestamps: true,
  }
);

export const Bug: Model<IBug> = mongoose.models.Bug || mongoose.model<IBug>("Bug", BugSchema);
