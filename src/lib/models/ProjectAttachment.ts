import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProjectAttachment extends Document {
  projectId: mongoose.Types.ObjectId;
  filename?: string;
  originalName: string;
  mimeType?: string;
  size?: number;
  folder: string;
  isFolder: boolean;
  uploadedBy: mongoose.Types.ObjectId;
  uploadedAt: Date;
}

const ProjectAttachmentSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    filename: {
      type: String,
      required: function (this: any) {
        return !this.isFolder;
      },
      default: "",
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      default: "application/octet-stream",
    },
    size: {
      type: Number,
      default: 0,
    },
    folder: {
      type: String,
      default: "/",
      trim: true,
    },
    isFolder: {
      type: Boolean,
      default: false,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const ProjectAttachment: Model<IProjectAttachment> =
  mongoose.models.ProjectAttachment ||
  mongoose.model<IProjectAttachment>(
    "ProjectAttachment",
    ProjectAttachmentSchema
  );
