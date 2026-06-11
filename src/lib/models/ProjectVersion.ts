import mongoose, { Document, Model, Schema } from "mongoose";

export interface IChangedField {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface IProjectVersion extends Document {
  projectId: mongoose.Types.ObjectId;
  version: number;
  editedBy: mongoose.Types.ObjectId;
  editedAt: Date;
  previousSnapshot: any;
  newSnapshot: any;
  changedFields: IChangedField[];
  changeReason?: string;
}

const ProjectVersionSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
    previousSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    newSnapshot: {
      type: Schema.Types.Mixed,
      required: true,
    },
    changedFields: [
      {
        field: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
      },
    ],
    changeReason: String,
  },
  {
    timestamps: true,
  }
);

export const ProjectVersion: Model<IProjectVersion> =
  mongoose.models.ProjectVersion ||
  mongoose.model<IProjectVersion>("ProjectVersion", ProjectVersionSchema);
