import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClientDetails {
  companyName?: string;
  contactPerson?: string;
  email: string;
  contactNumber?: string;
}

export const FEATURE_KEYS = [
  "visitorManagement",
  "attendanceManagement",
  "digilockerAuthentication",
  "webApp",
  "androidApp",
  "iosApp",
  "videoKYC",
  "rbac",
  "adminPanel",
  "online",
  "offline",
  "cloud",
  "onPremise",
] as const;

export interface IFeatures extends Record<typeof FEATURE_KEYS[number], boolean> {}

export interface ITimeline {
  startDate: Date;
  endDate: Date;
}

export interface IProject extends Document {
  title: string;
  description?: string;
  clientDetails: IClientDetails;
  features: IFeatures;
  extraAddOns?: string;
  useCase?: string;
  targetUsers?: string;
  functionalRequirements?: string;
  nonFunctionalRequirements?: string;
  budget?: string;
  integrations?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  timeline: ITimeline;
  status: string;
  createdBy: mongoose.Types.ObjectId;
  
  // Tech Review
  feasibilityStatus: "Pending" | "Feasible" | "Not Feasible" | "Need Clarification";
  techOwner?: mongoose.Types.ObjectId;
  techTeamMembers: mongoose.Types.ObjectId[];
  complexity: "Low" | "Medium" | "High" | "Very High";
  estimatedEffort: string;
  estimatedDeliveryDate?: Date;
  assumptions: string;
  risks: string;
  openClarifications: string;
  recommendedTechStack: string;

  // UAT
  uatStatus: "Not Started" | "In Progress" | "Issues Found" | "Passed" | "Client Accepted" | "Rejected";

  // Delivery & Signoff
  deliveredModules: string;
  pendingItems: string;
  knownLimitations: string;
  deploymentDate?: Date;
  handoverDocs: string;
  trainingCompleted: boolean;
  uatPassed: boolean;
  internalApproval: {
    approved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
  };
  salesApproval: {
    approved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
  };
  clientSignoffStatus: "Pending" | "Approved" | "Waived";
  clientApprover: string;
  signoffAttachment?: {
    name: string;
    url: string;
  };
  finalRemarks: string;
  projectClosed: boolean;
  projectClosedBy?: mongoose.Types.ObjectId;
  projectClosedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    title: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    clientDetails: {
      companyName: {
        type: String,
        default: "",
      },
      contactPerson: String,
      email: {
        type: String,
        required: [true, "Email is required"],
      },
      contactNumber: String,
    },
    features: {
      visitorManagement: { type: Boolean, default: false },
      attendanceManagement: { type: Boolean, default: false },
      digilockerAuthentication: { type: Boolean, default: false },
      webApp: { type: Boolean, default: false },
      androidApp: { type: Boolean, default: false },
      iosApp: { type: Boolean, default: false },
      videoKYC: { type: Boolean, default: false },
      rbac: { type: Boolean, default: false },
      adminPanel: { type: Boolean, default: false },
      online: { type: Boolean, default: false },
      offline: { type: Boolean, default: false },
      cloud: { type: Boolean, default: false },
      onPremise: { type: Boolean, default: false },
    },
    extraAddOns: {
      type: String,
      default: "",
    },
    useCase: {
      type: String,
      default: "",
    },
    targetUsers: {
      type: String,
      default: "",
    },
    functionalRequirements: {
      type: String,
      default: "",
    },
    nonFunctionalRequirements: {
      type: String,
      default: "",
    },
    budget: {
      type: String,
      default: "",
    },
    integrations: {
      type: String,
      default: "",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    timeline: {
      startDate: { type: Date, required: [true, "Start Date is required"] },
      endDate: { type: Date, required: [true, "End Date is required"] },
    },
    status: {
      type: String,
      enum: [
        "Requirement Created",
        "Submitted for Tech Review",
        "Clarification Required",
        "Technically Approved",
        "Planning",
        "Development",
        "Testing/UAT",
        "Signoff Pending",
        "Delivered",
        "Closed",
        "Pending",
        "Active",
        "Completed",
      ],
      default: "Requirement Created",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Tech Review
    feasibilityStatus: {
      type: String,
      enum: ["Pending", "Feasible", "Not Feasible", "Need Clarification"],
      default: "Pending",
    },
    techOwner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    techTeamMembers: [{
      type: Schema.Types.ObjectId,
      ref: "User",
    }],
    complexity: {
      type: String,
      enum: ["Low", "Medium", "High", "Very High"],
      default: "Medium",
    },
    estimatedEffort: {
      type: String,
      default: "",
    },
    estimatedDeliveryDate: Date,
    assumptions: {
      type: String,
      default: "",
    },
    risks: {
      type: String,
      default: "",
    },
    openClarifications: {
      type: String,
      default: "",
    },
    recommendedTechStack: {
      type: String,
      default: "",
    },

    // UAT
    uatStatus: {
      type: String,
      enum: ["Not Started", "In Progress", "Issues Found", "Passed", "Client Accepted", "Rejected"],
      default: "Not Started",
    },

    // Delivery & Signoff
    deliveredModules: {
      type: String,
      default: "",
    },
    pendingItems: {
      type: String,
      default: "",
    },
    knownLimitations: {
      type: String,
      default: "",
    },
    deploymentDate: Date,
    handoverDocs: {
      type: String,
      default: "",
    },
    trainingCompleted: {
      type: Boolean,
      default: false,
    },
    uatPassed: {
      type: Boolean,
      default: false,
    },
    internalApproval: {
      approved: { type: Boolean, default: false },
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
    },
    salesApproval: {
      approved: { type: Boolean, default: false },
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
    },
    clientSignoffStatus: {
      type: String,
      enum: ["Pending", "Approved", "Waived"],
      default: "Pending",
    },
    clientApprover: {
      type: String,
      default: "",
    },
    signoffAttachment: {
      name: String,
      url: String,
    },
    finalRemarks: {
      type: String,
      default: "",
    },
    projectClosed: {
      type: Boolean,
      default: false,
    },
    projectClosedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    projectClosedAt: Date,
  },
  {
    timestamps: true,
  }
);

export const Project: Model<IProject> =
  mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
