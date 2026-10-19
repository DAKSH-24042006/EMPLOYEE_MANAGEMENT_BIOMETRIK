import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEmailTemplate {
  subject: string;
  body: string;
}

export interface IBugNotificationRule {
  enabled: boolean;
  notifyAssignee: boolean;
  notifyQA: boolean;
  notifyProjectManager: boolean;
  customEmail?: string;
  template: IEmailTemplate;
}

export interface IBugNotificationsConfig {
  enabled?: boolean;
  bugReported: IBugNotificationRule;
  bugAssigned: IBugNotificationRule;
  bugReassigned: IBugNotificationRule;
  fixSubmitted: IBugNotificationRule;
  bugClosed: IBugNotificationRule;
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

  // Bug Notifications (Configurable in Admin UI)
  bugNotifications?: IBugNotificationsConfig;

  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema(
  {
    subject: { type: String, required: false, default: "" },
    body: { type: String, required: false, default: "" },
  },
  { _id: false }
);

const BugNotificationRuleSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    notifyAssignee: { type: Boolean, default: true },
    notifyQA: { type: Boolean, default: false },
    notifyProjectManager: { type: Boolean, default: true },
    customEmail: { type: String, default: "" },
    template: { type: EmailTemplateSchema, default: () => ({ subject: "", body: "" }) },
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
          subject: "[kramik] New Task Assigned: {{taskTitle}}",
          body: `Hello {{assigneeName}},

A new task has been created and assigned to you in project "{{projectName}}".

Task Details:
- Title: {{taskTitle}}
- Priority: {{priority}}
- Due Date: {{dueDate}}
- Project Manager: {{projectManagerName}}

Description:
{{description}}

Review the task details and update your progress directly in the workspace.

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
    bugNotifications: {
      enabled: { type: Boolean, default: true },
      bugReported: {
        type: BugNotificationRuleSchema,
        default: () => ({
          enabled: true,
          notifyAssignee: true,
          notifyQA: false,
          notifyProjectManager: true,
          customEmail: "",
          template: {
            subject:
              "[Biometrik Defect {{bugId}}] [{{severity}}] New Bug Reported in {{projectName}}",
            body: `Hello {{recipientName}},\n\nA new defect {{bugId}} has been reported in project "{{projectName}}".\n\nTitle: {{title}}\nSeverity: {{severity}}\nReported By: {{reportedByName}}\n\nDescription:\n{{description}}\n\nRemarks:\n{{remarks}}\n\nPlease review and investigate:\n{{bugUrl}}`,
          },
        }),
      },
      bugAssigned: {
        type: BugNotificationRuleSchema,
        default: () => ({
          enabled: true,
          notifyAssignee: true,
          notifyQA: false,
          notifyProjectManager: true,
          customEmail: "",
          template: {
            subject: "[Biometrik Defect {{bugId}}] [{{severity}}] Bug Assigned to You: {{title}}",
            body: `Hello {{recipientName}},\n\nYou have been assigned defect {{bugId}} in project "{{projectName}}".\n\nTitle: {{title}}\nSeverity: {{severity}}\nAssigned By: {{assignedByName}}\n\nAssignment Remarks:\n{{remarks}}\n\nPlease begin investigation and submit your fix in the workspace:\n{{bugUrl}}`,
          },
        }),
      },
      bugReassigned: {
        type: BugNotificationRuleSchema,
        default: () => ({
          enabled: true,
          notifyAssignee: true,
          notifyQA: false,
          notifyProjectManager: true,
          customEmail: "",
          template: {
            subject:
              "[Biometrik Defect {{bugId}}] [{{severity}}] Defect Reassigned to You: {{title}}",
            body: `Hello {{recipientName}},\n\nDefect {{bugId}} in project "{{projectName}}" has been reassigned to you.\n\nTitle: {{title}}\nSeverity: {{severity}}\nPrevious Assignee: {{previousAssigneeName}}\nReassigned By: {{reassignedByName}}\n\nReassignment Remarks:\n{{remarks}}\n\nPlease inspect the issue in the workspace:\n{{bugUrl}}`,
          },
        }),
      },
      fixSubmitted: {
        type: BugNotificationRuleSchema,
        default: () => ({
          enabled: true,
          notifyAssignee: true,
          notifyQA: true,
          notifyProjectManager: true,
          customEmail: "",
          template: {
            subject: "[Biometrik Defect {{bugId}}] Fix Submitted by {{developerName}}: {{title}}",
            body: `Hello Team,\n\nA fix has been submitted for defect {{bugId}} in project "{{projectName}}" and is awaiting QA verification.\n\nTitle: {{title}}\nSeverity: {{severity}}\nDeveloper: {{developerName}}\n\nResolution Remarks:\n{{remarks}}\n\nPlease test and verify the fix in the workspace:\n{{bugUrl}}`,
          },
        }),
      },
      bugClosed: {
        type: BugNotificationRuleSchema,
        default: () => ({
          enabled: true,
          notifyAssignee: true,
          notifyQA: true,
          notifyProjectManager: true,
          customEmail: "",
          template: {
            subject: "[Biometrik QA PASSED] Defect {{bugId}} Verified & Closed: {{title}}",
            body: `Hello Team,\n\nDefect {{bugId}} in project "{{projectName}}" has PASSED QA verification and is marked as closed.\n\nTitle: {{title}}\nVerified By: {{qaName}}\n\nQA Sign-off Remarks:\n{{remarks}}\n\nView details in workspace:\n{{bugUrl}}`,
          },
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
