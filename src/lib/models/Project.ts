import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClientDetails {
  companyName: string;
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
  status: "Pending" | "Active" | "Completed";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    title: {
      type: String,
      default: "",
    },
    clientDetails: {
      companyName: {
        type: String,
        required: [true, "Company Name is required"],
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
      enum: ["Pending", "Active", "Completed"],
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

export const Project: Model<IProject> =
  mongoose.models.Project ||
  mongoose.model<IProject>("Project", ProjectSchema);
