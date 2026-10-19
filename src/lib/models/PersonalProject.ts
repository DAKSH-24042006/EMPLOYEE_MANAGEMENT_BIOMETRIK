import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPersonalProject extends Document {
  user: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PersonalProjectSchema = new Schema<IPersonalProject>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring each user can pin a given project only once
PersonalProjectSchema.index({ user: 1, project: 1 }, { unique: true });

export const PersonalProject: Model<IPersonalProject> =
  mongoose.models.PersonalProject ||
  mongoose.model<IPersonalProject>("PersonalProject", PersonalProjectSchema);
