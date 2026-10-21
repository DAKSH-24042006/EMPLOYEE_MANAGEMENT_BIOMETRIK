"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Tabs,
  Typography,
  Tag,
  Space,
  Divider,
  App,
  Alert,
  Spin,
  Tooltip,
  Checkbox,
} from "antd";
import {
  Mail,
  Send,
  Save,
  Clock,
  Settings,
  FileText,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Bug,
} from "lucide-react";

const { Title, Text, Paragraph } = Typography;

interface TemplateConfig {
  subject: string;
  body: string;
}

interface EmailConfigData {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass?: string;
  hasPassword?: boolean;
  fromEmail: string;
  fromName: string;
  isEnabled: boolean;
  reminderDaysBeforeDue: number;
  sendOnDueDate: boolean;
  overdueIntervalDays: number;
  templates: {
    taskCreated: TemplateConfig;
    deadlineApproaching: TemplateConfig;
    deadlineToday: TemplateConfig;
    taskOverdue: TemplateConfig;
  };
  bugNotifications?: Record<
    string,
    {
      enabled: boolean;
      notifyAssignee: boolean;
      notifyQA: boolean;
      notifyProjectManager: boolean;
      customEmail?: string;
      template: TemplateConfig;
    }
  >;
}

export default function EmailSettingsPanel() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testRecipient, setTestRecipient] = useState("");
  const [activeTemplateTab, setActiveTemplateTab] = useState("taskCreated");
  const [activeBugTab, setActiveBugTab] = useState("bugReported");

  const [form] = Form.useForm();
  const [config, setConfig] = useState<EmailConfigData | null>(null);

  // Load config on mount
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/email-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load email settings");

      const cfg = data.data;
      setConfig(cfg);
      form.setFieldsValue({
        smtpHost: cfg.smtpHost || "smtp.office365.com",
        smtpPort: cfg.smtpPort || 587,
        smtpSecure: Boolean(cfg.smtpSecure),
        smtpUser: cfg.smtpUser || "notifications@biometrik.in",
        smtpPass: cfg.smtpPass ? "••••••••" : "",
        fromEmail: cfg.fromEmail || "notifications@biometrik.in",
        fromName: cfg.fromName || "Biometrik Systems Notifications",
        isEnabled: cfg.isEnabled ?? true,
        reminderDaysBeforeDue: cfg.reminderDaysBeforeDue ?? 1,
        sendOnDueDate: cfg.sendOnDueDate ?? true,
        overdueIntervalDays: cfg.overdueIntervalDays ?? 2,
        taskCreatedSubject: cfg.templates?.taskCreated?.subject || "",
        taskCreatedBody: cfg.templates?.taskCreated?.body || "",
        approachingSubject: cfg.templates?.deadlineApproaching?.subject || "",
        approachingBody: cfg.templates?.deadlineApproaching?.body || "",
        todaySubject: cfg.templates?.deadlineToday?.subject || "",
        todayBody: cfg.templates?.deadlineToday?.body || "",
        overdueSubject: cfg.templates?.taskOverdue?.subject || "",
        overdueBody: cfg.templates?.taskOverdue?.body || "",

        // Bug Notifications Config
        bugNotifications_masterEnabled: cfg.bugNotifications?.enabled ?? true,
        bugReported_enabled: cfg.bugNotifications?.bugReported?.enabled ?? true,
        bugReported_notifyAssignee: cfg.bugNotifications?.bugReported?.notifyAssignee ?? true,
        bugReported_notifyQA: cfg.bugNotifications?.bugReported?.notifyQA ?? false,
        bugReported_notifyPM: cfg.bugNotifications?.bugReported?.notifyProjectManager ?? true,
        bugReported_customEmail: cfg.bugNotifications?.bugReported?.customEmail || "",
        bugReported_subject: cfg.bugNotifications?.bugReported?.template?.subject || "",
        bugReported_body: cfg.bugNotifications?.bugReported?.template?.body || "",

        bugAssigned_enabled: cfg.bugNotifications?.bugAssigned?.enabled ?? true,
        bugAssigned_notifyAssignee: cfg.bugNotifications?.bugAssigned?.notifyAssignee ?? true,
        bugAssigned_notifyQA: cfg.bugNotifications?.bugAssigned?.notifyQA ?? false,
        bugAssigned_notifyPM: cfg.bugNotifications?.bugAssigned?.notifyProjectManager ?? true,
        bugAssigned_customEmail: cfg.bugNotifications?.bugAssigned?.customEmail || "",
        bugAssigned_subject: cfg.bugNotifications?.bugAssigned?.template?.subject || "",
        bugAssigned_body: cfg.bugNotifications?.bugAssigned?.template?.body || "",

        bugReassigned_enabled: cfg.bugNotifications?.bugReassigned?.enabled ?? true,
        bugReassigned_notifyAssignee: cfg.bugNotifications?.bugReassigned?.notifyAssignee ?? true,
        bugReassigned_notifyQA: cfg.bugNotifications?.bugReassigned?.notifyQA ?? false,
        bugReassigned_notifyPM: cfg.bugNotifications?.bugReassigned?.notifyProjectManager ?? true,
        bugReassigned_customEmail: cfg.bugNotifications?.bugReassigned?.customEmail || "",
        bugReassigned_subject: cfg.bugNotifications?.bugReassigned?.template?.subject || "",
        bugReassigned_body: cfg.bugNotifications?.bugReassigned?.template?.body || "",

        fixSubmitted_enabled: cfg.bugNotifications?.fixSubmitted?.enabled ?? true,
        fixSubmitted_notifyAssignee: cfg.bugNotifications?.fixSubmitted?.notifyAssignee ?? true,
        fixSubmitted_notifyQA: cfg.bugNotifications?.fixSubmitted?.notifyQA ?? true,
        fixSubmitted_notifyPM: cfg.bugNotifications?.fixSubmitted?.notifyProjectManager ?? true,
        fixSubmitted_customEmail: cfg.bugNotifications?.fixSubmitted?.customEmail || "",
        fixSubmitted_subject: cfg.bugNotifications?.fixSubmitted?.template?.subject || "",
        fixSubmitted_body: cfg.bugNotifications?.fixSubmitted?.template?.body || "",

        bugClosed_enabled: cfg.bugNotifications?.bugClosed?.enabled ?? true,
        bugClosed_notifyAssignee: cfg.bugNotifications?.bugClosed?.notifyAssignee ?? true,
        bugClosed_notifyQA: cfg.bugNotifications?.bugClosed?.notifyQA ?? true,
        bugClosed_notifyPM: cfg.bugNotifications?.bugClosed?.notifyProjectManager ?? true,
        bugClosed_customEmail: cfg.bugNotifications?.bugClosed?.customEmail || "",
        bugClosed_subject: cfg.bugNotifications?.bugClosed?.template?.subject || "",
        bugClosed_body: cfg.bugNotifications?.bugClosed?.template?.body || "",
      });
    } catch (err: any) {
      message.error(err.message || "Failed to fetch email settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Save Settings
  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const payload = {
        smtpHost: values.smtpHost,
        smtpPort: values.smtpPort,
        smtpSecure: values.smtpSecure,
        smtpUser: values.smtpUser,
        smtpPass: values.smtpPass,
        fromEmail: values.fromEmail,
        fromName: values.fromName,
        isEnabled: values.isEnabled,
        reminderDaysBeforeDue: values.reminderDaysBeforeDue,
        sendOnDueDate: values.sendOnDueDate,
        overdueIntervalDays: values.overdueIntervalDays,
        templates: {
          taskCreated: {
            subject: values.taskCreatedSubject,
            body: values.taskCreatedBody,
          },
          deadlineApproaching: {
            subject: values.approachingSubject,
            body: values.approachingBody,
          },
          deadlineToday: {
            subject: values.todaySubject,
            body: values.todayBody,
          },
          taskOverdue: {
            subject: values.overdueSubject,
            body: values.overdueBody,
          },
        },
        bugNotifications: {
          enabled: values.bugNotifications_masterEnabled ?? true,
          bugReported: {
            enabled: values.bugReported_enabled ?? true,
            notifyAssignee: values.bugReported_notifyAssignee ?? true,
            notifyQA: values.bugReported_notifyQA ?? false,
            notifyProjectManager: values.bugReported_notifyPM ?? true,
            customEmail: values.bugReported_customEmail || "",
            template: {
              subject: values.bugReported_subject || "",
              body: values.bugReported_body || "",
            },
          },
          bugAssigned: {
            enabled: values.bugAssigned_enabled ?? true,
            notifyAssignee: values.bugAssigned_notifyAssignee ?? true,
            notifyQA: values.bugAssigned_notifyQA ?? false,
            notifyProjectManager: values.bugAssigned_notifyPM ?? true,
            customEmail: values.bugAssigned_customEmail || "",
            template: {
              subject: values.bugAssigned_subject || "",
              body: values.bugAssigned_body || "",
            },
          },
          bugReassigned: {
            ...(config?.bugNotifications?.bugReassigned || {}),
            enabled: false,
          },
          fixSubmitted: {
            ...(config?.bugNotifications?.fixSubmitted || {}),
            enabled: false,
          },
          bugClosed: {
            ...(config?.bugNotifications?.bugClosed || {}),
            enabled: false,
          },
        },
      };

      const res = await fetch("/api/admin/email-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save email settings");

      message.success("Email configuration and templates saved successfully!");
      fetchSettings();
    } catch (err: any) {
      message.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Test Email
  const handleTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes("@")) {
      message.warning("Please enter a valid recipient email to test.");
      return;
    }

    setTestingEmail(true);
    try {
      const currentValues = form.getFieldsValue();
      const res = await fetch("/api/admin/email-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testEmail: testRecipient,
          smtpHost: currentValues.smtpHost,
          smtpPort: currentValues.smtpPort,
          smtpSecure: currentValues.smtpSecure,
          smtpUser: currentValues.smtpUser,
          smtpPass: currentValues.smtpPass,
          fromEmail: currentValues.fromEmail,
          fromName: currentValues.fromName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send test email");

      message.success(
        `Diagnostic test email dispatched to ${testRecipient}! Please check your inbox.`
      );
    } catch (err: any) {
      message.error(
        err.message || "Failed to send test email. Verify SMTP host, port, and credentials."
      );
    } finally {
      setTestingEmail(false);
    }
  };

  // Helper to insert placeholders into active template body
  const insertPlaceholder = (fieldName: string, token: string) => {
    const currentVal = form.getFieldValue(fieldName) || "";
    form.setFieldsValue({ [fieldName]: `${currentVal} ${token}` });
  };

  // Live sample preview data
  const sampleData: Record<string, string> = {
    taskTitle: "Implement SSO Authentication",
    assigneeName: "Rahul Sharma",
    projectName: "NovaTech Portal",
    dueDate: "25 Sep 2026",
    projectManagerName: "Daksh Patel",
    priority: "High",
    status: "In Progress",
    description: "Connect Microsoft Graph OAuth2 endpoint and test session cookies.",
    daysLeft: String(form.getFieldValue("reminderDaysBeforeDue") || 1),
    daysOverdue: String(form.getFieldValue("overdueIntervalDays") || 2),
    intervalDays: String(form.getFieldValue("overdueIntervalDays") || 2),
    taskUrl:
      typeof window !== "undefined"
        ? window.location.origin + "/projects/64a123bc456de789f0123456"
        : "/projects/64a123bc456de789f0123456",
  };

  const renderSamplePreview = (templateText: string) => {
    if (!templateText) return "Preview will appear here...";
    let text = templateText;
    for (const [k, v] of Object.entries(sampleData)) {
      text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), v);
    }
    return text;
  };

  return (
    <Spin
      spinning={loading}
      tip={
        <div style={{ marginTop: 16, color: "#64748b" }}>Loading email system configuration...</div>
      }
      size="large"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          ...(loading ? { opacity: 0.5, pointerEvents: "none" } : {}),
        }}
      >
        {/* Overview Banner */}
        <Alert
          title={
            <Space>
              <Mail size={18} color="#00897b" />
              <Text strong style={{ fontSize: 15 }}>
                Automated Task & Deadline Email Engine
              </Text>
            </Space>
          }
          description={
            <div>
              Configure your SMTP mail server, schedule exact delivery intervals for task
              notifications, and customize email templates with dynamic tokens.
              <div style={{ marginTop: 4, fontWeight: 500, color: "#00897b" }}>
                Note: When new tasks are assigned, the Project Manager is automatically CC'd on the
                confirmation email.
              </div>
            </div>
          }
          type="info"
          showIcon={false}
          style={{ borderRadius: 10, border: "1px solid #b2dfdb", backgroundColor: "#f0fdf4" }}
        />

        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={[20, 20]}>
            {/* Left Column: SMTP Configuration & Timing Cadence */}
            <Col xs={24} lg={10}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* 1. Global Activation & SMTP Configuration */}
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    border: "1px solid #e2e8f0",
                  }}
                  title={
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Space size={8}>
                        <Settings size={18} color="#00897b" />
                        <Text strong style={{ fontSize: 15 }}>
                          SMTP Server Configuration
                        </Text>
                      </Space>
                    </div>
                  }
                >
                  <Form.Item
                    name="isEnabled"
                    valuePropName="checked"
                    label="Email System Status"
                    extra="Enable or disable all outbound automated notifications"
                    style={{ marginBottom: 16 }}
                  >
                    <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                  </Form.Item>

                  <Form.Item
                    name="smtpHost"
                    label="SMTP Server Host"
                    rules={[{ required: true, message: "Host is required (e.g. smtp.gmail.com)" }]}
                  >
                    <Input placeholder="e.g. smtp.gmail.com or mail.biometrik.com" />
                  </Form.Item>

                  <Row gutter={12}>
                    <Col span={14}>
                      <Form.Item name="smtpPort" label="Port" rules={[{ required: true }]}>
                        <InputNumber style={{ width: "100%" }} placeholder="587 or 465" />
                      </Form.Item>
                    </Col>
                    <Col span={10}>
                      <Form.Item name="smtpSecure" label="SSL / TLS" valuePropName="checked">
                        <Switch checkedChildren="SSL" unCheckedChildren="TLS" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="smtpUser"
                    label="SMTP Username / Auth Email"
                    rules={[{ required: true, message: "Username or email is required" }]}
                  >
                    <Input placeholder="e.g. notifications@biometriksystems.com" />
                  </Form.Item>

                  <Form.Item
                    name="smtpPass"
                    label="SMTP Password / App Key"
                    extra={
                      config?.hasPassword
                        ? "Password saved. Leave as •••••••• to keep current password."
                        : "Enter your SMTP password or application key."
                    }
                  >
                    <Input.Password placeholder="••••••••" />
                  </Form.Item>

                  <Divider style={{ margin: "16px 0" }} />

                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item name="fromName" label="From Display Name">
                        <Input placeholder="Biometrik Systems" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="fromEmail" label="Sender Email Address">
                        <Input placeholder="notifications@biometrik.com" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Diagnostic Test Email Sender */}
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: 14,
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                      Send Diagnostic Test Email
                    </Text>
                    <Space.Compact style={{ width: "100%" }}>
                      <Input
                        placeholder="recipient@example.com"
                        value={testRecipient}
                        onChange={(e) => setTestRecipient(e.target.value)}
                      />
                      <Button
                        type="primary"
                        icon={<Send size={14} />}
                        onClick={handleTestEmail}
                        loading={testingEmail}
                        style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
                      >
                        Test
                      </Button>
                    </Space.Compact>
                  </div>
                </Card>

                {/* 2. Cadence & Trigger Intervals ("NUMBERS OF LIKE WHEN TO SEND THE MAIL") */}
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                    border: "1px solid #e2e8f0",
                  }}
                  title={
                    <Space size={8}>
                      <Clock size={18} color="#f59e0b" />
                      <Text strong style={{ fontSize: 15 }}>
                        Notification Cadence & Intervals
                      </Text>
                    </Space>
                  }
                >
                  <Form.Item
                    name="reminderDaysBeforeDue"
                    label="Days Before Deadline to Send Reminder"
                    extra="Default is 1. Sends an alert stating 'only X day(s) left' before the deadline."
                    rules={[{ required: true }]}
                  >
                    <Space.Compact style={{ width: "100%" }}>
                      <InputNumber min={1} max={30} style={{ width: "100%" }} />
                      <Input
                        style={{
                          width: "140px",
                          textAlign: "center",
                          backgroundColor: "#fafafa",
                          color: "#333",
                          cursor: "default",
                        }}
                        defaultValue="Day(s) Before"
                        readOnly
                        tabIndex={-1}
                      />
                    </Space.Compact>
                  </Form.Item>

                  <Form.Item
                    name="sendOnDueDate"
                    valuePropName="checked"
                    label="Day-of-Deadline Alert"
                    extra="Automatically sends an urgent notice on the exact day of the deadline."
                  >
                    <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                  </Form.Item>

                  <Form.Item
                    name="overdueIntervalDays"
                    label="Overdue Reminder Frequency"
                    extra="Default is 2. Sends an automated reminder every N days while the task remains overdue and incomplete."
                    rules={[{ required: true }]}
                  >
                    <Space.Compact style={{ width: "100%" }}>
                      <InputNumber min={1} max={30} style={{ width: "100%" }} />
                      <Input
                        style={{
                          width: "140px",
                          textAlign: "center",
                          backgroundColor: "#fafafa",
                          color: "#333",
                          cursor: "default",
                        }}
                        defaultValue="Every N Days"
                        readOnly
                        tabIndex={-1}
                      />
                    </Space.Compact>
                  </Form.Item>
                </Card>
              </div>
            </Col>

            {/* Right Column: Interactive Template Editor ("TEMPLATE MUST BE EDITABLE BY THE SYSTEM ADMIN") */}
            <Col xs={24} lg={14}>
              <Card
                variant="borderless"
                style={{
                  borderRadius: 12,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  border: "1px solid #e2e8f0",
                }}
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                    }}
                  >
                    <Space size={8}>
                      <FileText size={18} color="#00897b" />
                      <Text strong style={{ fontSize: 15 }}>
                        Email Templates & Message Customization
                      </Text>
                    </Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<Save size={15} />}
                      loading={saving}
                      style={{
                        backgroundColor: "#00897b",
                        borderColor: "#00897b",
                        fontWeight: 600,
                      }}
                    >
                      Save All Settings
                    </Button>
                  </div>
                }
              >
                {/* Dynamic Tokens Quick Help */}
                <div
                  style={{
                    marginBottom: 16,
                    background: "#f8fafc",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Text
                    strong
                    style={{ fontSize: 12, display: "block", marginBottom: 6, color: "#475569" }}
                  >
                    Dynamic Placeholders (Click to insert into active template):
                  </Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {[
                      "{{taskTitle}}",
                      "{{assigneeName}}",
                      "{{projectName}}",
                      "{{dueDate}}",
                      "{{projectManagerName}}",
                      "{{priority}}",
                      "{{status}}",
                      "{{description}}",
                      "{{taskUrl}}",
                      "{{daysLeft}}",
                      "{{daysOverdue}}",
                      "{{intervalDays}}",
                    ].map((token) => (
                      <Tag
                        key={token}
                        color="blue"
                        style={{ cursor: "pointer", fontSize: 11 }}
                        onClick={() => {
                          const bodyFieldMap: Record<string, string> = {
                            taskCreated: "taskCreatedBody",
                            approaching: "approachingBody",
                            today: "todayBody",
                            overdue: "overdueBody",
                          };
                          const targetField = bodyFieldMap[activeTemplateTab] || "taskCreatedBody";
                          insertPlaceholder(targetField, token);
                        }}
                      >
                        + {token}
                      </Tag>
                    ))}
                  </div>
                </div>

                <Tabs
                  activeKey={activeTemplateTab}
                  onChange={setActiveTemplateTab}
                  items={[
                    {
                      key: "taskCreated",
                      label: "1. Task Created & Assigned",
                      children: (
                        <div>
                          <Alert
                            title="Initial Task Assignment Notification"
                            description="Dispatched instantly upon task creation to the assignee. The Project Manager is automatically CC'd on this message."
                            type="success"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                          <Form.Item
                            name="taskCreatedSubject"
                            label="Email Subject Line"
                            rules={[{ required: true }]}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name="taskCreatedBody"
                            label="Email Message Body (Plain Text)"
                            rules={[{ required: true }]}
                          >
                            <Input.TextArea
                              rows={8}
                              style={{ fontFamily: "monospace", fontSize: 13 }}
                            />
                          </Form.Item>
                          <Card
                            size="small"
                            title="Live Preview (Sample Render)"
                            style={{ background: "#fafafa" }}
                          >
                            <Form.Item shouldUpdate noStyle>
                              {() => (
                                <Paragraph
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontSize: 12,
                                    color: "#334155",
                                  }}
                                >
                                  <strong>Subject:</strong>{" "}
                                  {renderSamplePreview(form.getFieldValue("taskCreatedSubject"))}
                                  <Divider style={{ margin: "8px 0" }} />
                                  {renderSamplePreview(form.getFieldValue("taskCreatedBody"))}
                                </Paragraph>
                              )}
                            </Form.Item>
                          </Card>
                        </div>
                      ),
                    },
                    {
                      key: "approaching",
                      label: "2. Deadline Approaching",
                      children: (
                        <div>
                          <Alert
                            title="Upcoming Deadline Notification"
                            description="Dispatched X days before the task deadline (as configured in the Cadence interval on the left)."
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                          <Form.Item
                            name="approachingSubject"
                            label="Email Subject Line"
                            rules={[{ required: true }]}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name="approachingBody"
                            label="Email Message Body (Plain Text)"
                            rules={[{ required: true }]}
                          >
                            <Input.TextArea
                              rows={8}
                              style={{ fontFamily: "monospace", fontSize: 13 }}
                            />
                          </Form.Item>
                          <Card
                            size="small"
                            title="Live Preview (Sample Render)"
                            style={{ background: "#fafafa" }}
                          >
                            <Form.Item shouldUpdate noStyle>
                              {() => (
                                <Paragraph
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontSize: 12,
                                    color: "#334155",
                                  }}
                                >
                                  <strong>Subject:</strong>{" "}
                                  {renderSamplePreview(form.getFieldValue("approachingSubject"))}
                                  <Divider style={{ margin: "8px 0" }} />
                                  {renderSamplePreview(form.getFieldValue("approachingBody"))}
                                </Paragraph>
                              )}
                            </Form.Item>
                          </Card>
                        </div>
                      ),
                    },
                    {
                      key: "today",
                      label: "3. Deadline Today",
                      children: (
                        <div>
                          <Alert
                            title="Day-of-Deadline Urgent Notification"
                            description="Dispatched on the morning / day of the task deadline to remind the assignee to deliver or update progress."
                            type="warning"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                          <Form.Item
                            name="todaySubject"
                            label="Email Subject Line"
                            rules={[{ required: true }]}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name="todayBody"
                            label="Email Message Body (Plain Text)"
                            rules={[{ required: true }]}
                          >
                            <Input.TextArea
                              rows={8}
                              style={{ fontFamily: "monospace", fontSize: 13 }}
                            />
                          </Form.Item>
                          <Card
                            size="small"
                            title="Live Preview (Sample Render)"
                            style={{ background: "#fafafa" }}
                          >
                            <Form.Item shouldUpdate noStyle>
                              {() => (
                                <Paragraph
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontSize: 12,
                                    color: "#334155",
                                  }}
                                >
                                  <strong>Subject:</strong>{" "}
                                  {renderSamplePreview(form.getFieldValue("todaySubject"))}
                                  <Divider style={{ margin: "8px 0" }} />
                                  {renderSamplePreview(form.getFieldValue("todayBody"))}
                                </Paragraph>
                              )}
                            </Form.Item>
                          </Card>
                        </div>
                      ),
                    },
                    {
                      key: "overdue",
                      label: "4. Overdue Task Reminder",
                      children: (
                        <div>
                          <Alert
                            title="Recurring Overdue Notice"
                            description="Repeated every N days (as configured in the Overdue Frequency) until the task is marked as Completed."
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                          />
                          <Form.Item
                            name="overdueSubject"
                            label="Email Subject Line"
                            rules={[{ required: true }]}
                          >
                            <Input />
                          </Form.Item>
                          <Form.Item
                            name="overdueBody"
                            label="Email Message Body (Plain Text)"
                            rules={[{ required: true }]}
                          >
                            <Input.TextArea
                              rows={8}
                              style={{ fontFamily: "monospace", fontSize: 13 }}
                            />
                          </Form.Item>
                          <Card
                            size="small"
                            title="Live Preview (Sample Render)"
                            style={{ background: "#fafafa" }}
                          >
                            <Form.Item shouldUpdate noStyle>
                              {() => (
                                <Paragraph
                                  style={{
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                    fontSize: 12,
                                    color: "#334155",
                                  }}
                                >
                                  <strong>Subject:</strong>{" "}
                                  {renderSamplePreview(form.getFieldValue("overdueSubject"))}
                                  <Divider style={{ margin: "8px 0" }} />
                                  {renderSamplePreview(form.getFieldValue("overdueBody"))}
                                </Paragraph>
                              )}
                            </Form.Item>
                          </Card>
                        </div>
                      ),
                    },
                  ]}
                />

                <div style={{ marginTop: 24, textAlign: "right" }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<Save size={16} />}
                    loading={saving}
                    size="large"
                    style={{
                      backgroundColor: "#00897b",
                      borderColor: "#00897b",
                      fontWeight: 600,
                      padding: "0 28px",
                    }}
                  >
                    Save Configuration & Templates
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Dedicated Bug Tracking Notifications Section (Section 8) */}
          <Card
            variant="borderless"
            style={{
              marginTop: 20,
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              border: "1px solid #e2e8f0",
            }}
            title={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <Space size={8}>
                  <Bug size={18} color="#00897b" />
                  <Text strong style={{ fontSize: 16 }}>
                    Bug Notifications Configuration
                  </Text>
                </Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<Save size={15} />}
                  loading={saving}
                  style={{
                    backgroundColor: "#00897b",
                    borderColor: "#00897b",
                    fontWeight: 600,
                  }}
                >
                  Save Bug Notification Settings
                </Button>
              </div>
            }
          >
            <Alert
              message="Configurable Bug Lifecycle Notifications"
              description="Configure recipient routing rules, individual event toggles, and customized email templates for all bug defect workflows. When enabled, automated alerts dispatch with project metadata and deep links directly to the defect workspace."
              type="info"
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />

            {/* Master Switch for Bug Notifications */}
            <Card
              size="small"
              style={{
                marginBottom: 16,
                background: "#f0fdfa",
                border: "1px solid #99f6e4",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: "#0f766e", fontSize: 14 }}>
                    Master Switch: Bug Email Notifications
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Enable or disable all automated bug defect emails across the entire system.
                  </div>
                </div>
                <Form.Item name="bugNotifications_masterEnabled" valuePropName="checked" noStyle>
                  <Switch
                    checkedChildren="All Bug Emails ON"
                    unCheckedChildren="All Bug Emails OFF"
                  />
                </Form.Item>
              </div>
            </Card>

            {/* Supported Placeholders Reference */}
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                background: "#f8fafc",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                fontSize: 12,
              }}
            >
              <Text strong style={{ color: "#334155", display: "block", marginBottom: 6 }}>
                Supported Template Placeholders:
              </Text>
              <Space wrap size={[6, 6]}>
                {[
                  "{{bugId}}",
                  "{{title}}",
                  "{{projectName}}",
                  "{{severity}}",
                  "{{status}}",
                  "{{recipientName}}",
                  "{{assignedByName}}",
                  "{{previousAssigneeName}}",
                  "{{reassignedByName}}",
                  "{{developerName}}",
                  "{{qaName}}",
                  "{{remarks}}",
                  "{{description}}",
                  "{{bugUrl}}",
                ].map((ph) => (
                  <Tag key={ph} color="blue" style={{ fontFamily: "monospace", fontSize: 11 }}>
                    {ph}
                  </Tag>
                ))}
              </Space>
            </div>

            <Tabs
              activeKey={activeBugTab}
              onChange={setActiveBugTab}
              items={[
                {
                  key: "bugReported",
                  label: "1. New Bug Reported",
                  children: (
                    <div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugReported_enabled"
                            valuePropName="checked"
                            label={<strong>Enable Notification</strong>}
                            extra="Send email whenever a new bug is reported on any project"
                          >
                            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugReported_customEmail"
                            label="Additional CC Email / Distribution List"
                            extra="Optional comma-separated email addresses"
                          >
                            <Input placeholder="e.g. qa-team@biometrik.in, devlead@biometrik.in" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div
                        style={{
                          marginBottom: 16,
                          padding: "12px 16px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Text strong style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                          Recipient Rules:
                        </Text>
                        <Space direction="horizontal" wrap size={24}>
                          <Form.Item
                            name="bugReported_notifyAssignee"
                            valuePropName="checked"
                            noStyle
                          >
                            <Checkbox>Assigned Developer / Triage Lead</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugReported_notifyQA" valuePropName="checked" noStyle>
                            <Checkbox>QA Lead</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugReported_notifyPM" valuePropName="checked" noStyle>
                            <Checkbox>Project Manager (techOwner)</Checkbox>
                          </Form.Item>
                        </Space>
                      </div>

                      <Form.Item name="bugReported_subject" label="Subject Line">
                        <Input placeholder="[Biometrik Defect {{bugId}}] [{{severity}}] New Bug Reported in {{projectName}}" />
                      </Form.Item>
                      <Form.Item name="bugReported_body" label="Message Body">
                        <Input.TextArea
                          rows={6}
                          style={{ fontFamily: "monospace", fontSize: 13 }}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
                {
                  key: "bugAssigned",
                  label: "2. Bug Assigned",
                  children: (
                    <div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugAssigned_enabled"
                            valuePropName="checked"
                            label={<strong>Enable Notification</strong>}
                            extra="Send email when a defect is assigned to a developer"
                          >
                            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugAssigned_customEmail"
                            label="Additional CC Email / Distribution List"
                            extra="Optional comma-separated email addresses"
                          >
                            <Input placeholder="e.g. dev-team@biometrik.in" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div
                        style={{
                          marginBottom: 16,
                          padding: "12px 16px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Text strong style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                          Recipient Rules:
                        </Text>
                        <Space direction="horizontal" wrap size={24}>
                          <Form.Item
                            name="bugAssigned_notifyAssignee"
                            valuePropName="checked"
                            noStyle
                          >
                            <Checkbox>Assigned Developer</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugAssigned_notifyQA" valuePropName="checked" noStyle>
                            <Checkbox>QA Lead</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugAssigned_notifyPM" valuePropName="checked" noStyle>
                            <Checkbox>Project Manager (techOwner)</Checkbox>
                          </Form.Item>
                        </Space>
                      </div>

                      <Form.Item name="bugAssigned_subject" label="Subject Line">
                        <Input placeholder="[Biometrik Defect {{bugId}}] [{{severity}}] Bug Assigned to You: {{title}}" />
                      </Form.Item>
                      <Form.Item name="bugAssigned_body" label="Message Body">
                        <Input.TextArea
                          rows={6}
                          style={{ fontFamily: "monospace", fontSize: 13 }}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
                /*
                {
                  key: "bugReassigned",
                  label: "3. Bug Reassigned",
                  children: (
                    <div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugReassigned_enabled"
                            valuePropName="checked"
                            label={<strong>Enable Notification</strong>}
                            extra="Send email when a defect is reassigned to a different developer"
                          >
                            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugReassigned_customEmail"
                            label="Additional CC Email / Distribution List"
                            extra="Optional comma-separated email addresses"
                          >
                            <Input placeholder="e.g. dev-alerts@biometrik.in" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div
                        style={{
                          marginBottom: 16,
                          padding: "12px 16px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Text strong style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                          Recipient Rules:
                        </Text>
                        <Space direction="horizontal" wrap size={24}>
                          <Form.Item
                            name="bugReassigned_notifyAssignee"
                            valuePropName="checked"
                            noStyle
                          >
                            <Checkbox>New Assigned Developer</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugReassigned_notifyQA" valuePropName="checked" noStyle>
                            <Checkbox>QA Lead</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugReassigned_notifyPM" valuePropName="checked" noStyle>
                            <Checkbox>Project Manager (techOwner)</Checkbox>
                          </Form.Item>
                        </Space>
                      </div>

                      <Form.Item name="bugReassigned_subject" label="Subject Line">
                        <Input placeholder="[Biometrik Defect {{bugId}}] [{{severity}}] Defect Reassigned to You: {{title}}" />
                      </Form.Item>
                      <Form.Item name="bugReassigned_body" label="Message Body">
                        <Input.TextArea
                          rows={6}
                          style={{ fontFamily: "monospace", fontSize: 13 }}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
                {
                  key: "fixSubmitted",
                  label: "4. Fix Submitted for QA",
                  children: (
                    <div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="fixSubmitted_enabled"
                            valuePropName="checked"
                            label={<strong>Enable Notification</strong>}
                            extra="Send email when a developer submits a fix awaiting verification"
                          >
                            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="fixSubmitted_customEmail"
                            label="Additional CC Email / Distribution List"
                            extra="Optional comma-separated email addresses"
                          >
                            <Input placeholder="e.g. qa-verifications@biometrik.in" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div
                        style={{
                          marginBottom: 16,
                          padding: "12px 16px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Text strong style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                          Recipient Rules:
                        </Text>
                        <Space direction="horizontal" wrap size={24}>
                          <Form.Item name="fixSubmitted_notifyQA" valuePropName="checked" noStyle>
                            <Checkbox>Designated QA Lead / QA Team</Checkbox>
                          </Form.Item>
                          <Form.Item name="fixSubmitted_notifyPM" valuePropName="checked" noStyle>
                            <Checkbox>Project Manager (techOwner)</Checkbox>
                          </Form.Item>
                          <Form.Item
                            name="fixSubmitted_notifyAssignee"
                            valuePropName="checked"
                            noStyle
                          >
                            <Checkbox>Developer Confirmation Copy</Checkbox>
                          </Form.Item>
                        </Space>
                      </div>

                      <Form.Item name="fixSubmitted_subject" label="Subject Line">
                        <Input placeholder="[Biometrik Defect {{bugId}}] Fix Submitted by {{developerName}}: {{title}}" />
                      </Form.Item>
                      <Form.Item name="fixSubmitted_body" label="Message Body">
                        <Input.TextArea
                          rows={6}
                          style={{ fontFamily: "monospace", fontSize: 13 }}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
                {
                  key: "bugClosed",
                  label: "5. Bug Resolved / Closed",
                  children: (
                    <div>
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugClosed_enabled"
                            valuePropName="checked"
                            label={<strong>Enable Notification</strong>}
                            extra="Send email when a defect passes verification and is marked closed"
                          >
                            <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            name="bugClosed_customEmail"
                            label="Additional CC Email / Distribution List"
                            extra="Optional comma-separated email addresses"
                          >
                            <Input placeholder="e.g. release-management@biometrik.in" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <div
                        style={{
                          marginBottom: 16,
                          padding: "12px 16px",
                          background: "#f8fafc",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Text strong style={{ display: "block", marginBottom: 8, fontSize: 12 }}>
                          Recipient Rules:
                        </Text>
                        <Space direction="horizontal" wrap size={24}>
                          <Form.Item
                            name="bugClosed_notifyAssignee"
                            valuePropName="checked"
                            noStyle
                          >
                            <Checkbox>Assigned Developer</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugClosed_notifyQA" valuePropName="checked" noStyle>
                            <Checkbox>QA Verifier</Checkbox>
                          </Form.Item>
                          <Form.Item name="bugClosed_notifyPM" valuePropName="checked" noStyle>
                            <Checkbox>Project Manager (techOwner)</Checkbox>
                          </Form.Item>
                        </Space>
                      </div>

                      <Form.Item name="bugClosed_subject" label="Subject Line">
                        <Input placeholder="[Biometrik QA PASSED] Defect {{bugId}} Verified & Closed: {{title}}" />
                      </Form.Item>
                      <Form.Item name="bugClosed_body" label="Message Body">
                        <Input.TextArea
                          rows={6}
                          style={{ fontFamily: "monospace", fontSize: 13 }}
                        />
                      </Form.Item>
                    </div>
                  ),
                },
                */
              ]}
            />
          </Card>
        </Form>
      </div>
    </Spin>
  );
}
