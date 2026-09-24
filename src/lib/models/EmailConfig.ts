import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEmailTemplate {
  subject: string;
  body: string;
}

export interface IEmailConfig extends Document {
  // SMTP Settings
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;

  // Cadence / Timing (Editable in Admin UI)
  reminderDaysBeforeDue: number; // e.g. 1 day before
  sendOnDueDate: boolean; // e.g. true (on day of deadline)
  overdueIntervalDays: number; // e.g. every 2 days

  // Editable Templates (Editable in Admin UI)
  templates: {
    taskCreated: IEmailTemplate;
    deadlineApproaching: IEmailTemplate;
    deadlineToday: IEmailTemplate;
    taskOverdue: IEmailTemplate;
  };

  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema(
  {
    // Not required at schema level — templates have hardcoded fallbacks in mailer.ts
    // This prevents validation crashes when only SMTP settings are saved from the UI
    subject: { type: String, required: false, default: "" },
    body: { type: String, required: false, default: "" },
  },
  { _id: false }
);

const EmailConfigSchema: Schema = new Schema(
  {
    smtpHost: { type: String, default: "" },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false },
    smtpUser: { type: String, default: "" },
    smtpPass: { type: String, default: "" },
    fromEmail: { type: String, default: "notifications@biometriksystems.com" },
    fromName: { type: String, default: "Biometrik Systems Notifications" },
    isEnabled: { type: Boolean, default: true },

    reminderDaysBeforeDue: { type: Number, default: 1 },
    sendOnDueDate: { type: Boolean, default: true },
    overdueIntervalDays: { type: Number, default: 2 },

    templates: {
      taskCreated: {
        type: EmailTemplateSchema,
        default: () => ({
          subject: "[Biometrik Systems] New Task Assigned: {{taskTitle}}",
          body: `Hello {{assigneeName}},

A new task has been created and assigned to you in project "{{projectName}}".

Task Details:
- Title: {{taskTitle}}
- Priority: {{priority}}
- Due Date: {{dueDate}}
- Project Manager: {{projectManagerName}}

Description:
{{description}}

Review the task details and update your progress directly in the workspace:
{{taskUrl}}

Best regards,`,
        }),
      },
      deadlineApproaching: {
        type: EmailTemplateSchema,
        default: () => ({
          subject:
            "[Biometrik Systems Reminder] Only {{daysLeft}} day left for task: {{taskTitle}}",
          body: `Hello {{assigneeName}},

This is an automated reminder that your assigned task is due soon.

Task Details:
- Title: {{taskTitle}}
- Project: {{projectName}}
- Due Date: {{dueDate}} (Only {{daysLeft}} day remaining)
- Current Status: {{status}}
- Priority: {{priority}}
- Project Manager: {{projectManagerName}}

Please review your progress and update the task directly in the workspace:
{{taskUrl}}

Best regards,`,
        }),
      },
      deadlineToday: {
        type: EmailTemplateSchema,
        default: () => ({
          subject: "[Biometrik Systems Urgent] Task Deadline Today: {{taskTitle}}",
          body: `Hello {{assigneeName}},

The deadline for your assigned task is TODAY.

Task Details:
- Title: {{taskTitle}}
- Project: {{projectName}}
- Deadline: {{dueDate}} (Today)
- Current Status: {{status}}
- Priority: {{priority}}
- Project Manager: {{projectManagerName}}

Please mark the task as Completed or post an update directly in the workspace:
{{taskUrl}}

Best regards,`,
        }),
      },
      taskOverdue: {
        type: EmailTemplateSchema,
        default: () => ({
          subject: "[Biometrik Systems Action Required] Overdue Task Reminder: {{taskTitle}}",
          body: `Hello {{assigneeName}},

Your assigned task is currently OVERDUE by {{daysOverdue}} days.

Task Details:
- Title: {{taskTitle}}
- Project: {{projectName}}
- Original Due Date: {{dueDate}}
- Overdue Duration: {{daysOverdue}} days
- Current Status: {{status}}
- Priority: {{priority}}
- Project Manager: {{projectManagerName}}

Please open the task and address it immediately:
{{taskUrl}}

Best regards,`,
        }),
      },
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export const EmailConfig: Model<IEmailConfig> =
  mongoose.models.EmailConfig || mongoose.model<IEmailConfig>("EmailConfig", EmailConfigSchema);
