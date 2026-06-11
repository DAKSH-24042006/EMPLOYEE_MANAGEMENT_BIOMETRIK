import mongoose, { Document, Model, Schema } from "mongoose";

export interface IGoogleToken extends Document {
  userId: mongoose.Types.ObjectId;
  accessToken: string;
  refreshToken: string;
  expiryDate: Date;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GoogleTokenSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    accessToken: {
      type: String,
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    email: String,
  },
  {
    timestamps: true,
  }
);

export const GoogleToken: Model<IGoogleToken> =
  mongoose.models.GoogleToken ||
  mongoose.model<IGoogleToken>("GoogleToken", GoogleTokenSchema);
