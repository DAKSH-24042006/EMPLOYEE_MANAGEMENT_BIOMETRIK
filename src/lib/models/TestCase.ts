import mongoose, { Document, Model, Schema } from "mongoose";

export interface ITestCaseAttachment {
  name: string;
  url: string;
}

export interface ITestCase extends Document {
  projectId: mongoose.Types.ObjectId;
  workItemId?: mongoose.Types.ObjectId;
  title: string;
  steps?: string;
  expectedResult?: string;
  actualResult?: string;
  status: "Not Tested" | "Passed" | "Failed" | "Retest" | "Blocked";
  testedBy?: mongoose.Types.ObjectId;
  evidenceAttachments: ITestCaseAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const TestCaseSchema: Schema = new Schema(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    workItemId: {
      type: Schema.Types.ObjectId,
      ref: "WorkItem",
    },
    title: {
      type: String,
      required: [true, "Test title is required"],
      trim: true,
    },
    steps: {
      type: String,
      default: "",
    },
    expectedResult: {
      type: String,
      default: "",
    },
    actualResult: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Not Tested", "Passed", "Failed", "Retest", "Blocked"],
      default: "Not Tested",
    },
    testedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    evidenceAttachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

TestCaseSchema.index({ projectId: 1, status: 1 });

export const TestCase: Model<ITestCase> =
  mongoose.models.TestCase ||
  mongoose.model<ITestCase>("TestCase", TestCaseSchema);
