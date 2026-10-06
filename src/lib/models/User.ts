import mongoose, { Document, Model, Schema } from "mongoose";
import { Role, UserStatus } from "../constants";

export interface IUser extends Document {
  name: string;
  username?: string;
  email: string;
  microsoftEmail?: string;
  microsoftId?: string;
  designation?: string;
  status: UserStatus | string;
  password?: string;
  role: Role | string;
  phoneNumber?: string;
  location?: string;
  profilePhoto?: string;
  bio?: string;
  pinnedProjects?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    microsoftEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    microsoftId: {
      type: String,
    },
    designation: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    // LEGACY PASSWORD AUTHENTICATION — OPTIONAL FOR MICROSOFT AUTH
    password: {
      type: String,
      required: false,
      select: false,
    },
    role: {
      type: String,
      required: true,
      default: Role.EMPLOYEE,
    },
    phoneNumber: {
      type: String,
      required: false,
      default: "",
      validate: {
        validator: function (v: string) {
          if (!v) return true; // Allow empty
          return /^[0-9]+$/.test(v);
        },
        message: (props: Record<string, unknown>) =>
          `${props.value} is not a valid phone number! Only numbers are allowed.`,
      },
    },
    location: {
      type: String,
      default: "",
    },
    profilePhoto: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    pinnedProjects: [
      {
        type: Schema.Types.ObjectId,
        ref: "Project",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
