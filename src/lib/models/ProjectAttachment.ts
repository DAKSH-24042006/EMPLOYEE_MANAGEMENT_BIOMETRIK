import mongoose, { Document, Model, Schema } from "mongoose";

export interface IProjectAttachment extends Document {
  projectId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
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
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
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
