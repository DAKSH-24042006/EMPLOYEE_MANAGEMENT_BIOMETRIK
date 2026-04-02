import mongoose, { Document, Model, Schema } from "mongoose";
import { Role } from "../constants";




export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: Role;
  phoneNumber: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.SALES,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      validate: {
        validator: function(v: string) {
          return /^[0-9]+$/.test(v);
        },
        message: (props: any) => `${props.value} is not a valid phone number! Only numbers are allowed.`
      }
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
  },
  {
    timestamps: true,
  }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
