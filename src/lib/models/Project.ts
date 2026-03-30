import mongoose, { Document, Model, Schema } from "mongoose";

export interface IClientDetails {
  companyName: string;
  contactPerson?: string;
  email: string;
}

export interface IFeatures {
  dashboard: boolean;
  webApp: boolean;
  androidApp: boolean;
  iosApp: boolean;
  adminPanel: boolean;
}

export interface ITimeline {
  startDate: Date;
  endDate: Date;
}

export interface IProject extends Document {
  clientDetails: IClientDetails;
  features: IFeatures;
  extraAddOns?: string;
  timeline: ITimeline;
  status: "Pending" | "Reviewed" | "Approved";
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema: Schema = new Schema(
  {
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
    },
    features: {
      dashboard: { type: Boolean, default: false },
      webApp: { type: Boolean, default: false },
      androidApp: { type: Boolean, default: false },
      iosApp: { type: Boolean, default: false },
      adminPanel: { type: Boolean, default: false },
    },
    extraAddOns: {
      type: String,
      default: "",
    },
    timeline: {
      startDate: { type: Date, required: [true, "Start Date is required"] },
      endDate: { type: Date, required: [true, "End Date is required"] },
    },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Approved"],
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
