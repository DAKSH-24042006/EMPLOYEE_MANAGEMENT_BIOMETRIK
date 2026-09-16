"use client";

import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  Form,
  Input,
  Select,
  Button,
  Space,
  Tag,
  App,
  Row,
  Col,
  Table,
  Badge,
  Tooltip,
  Divider,
} from "antd";
import {
  Mail,
  Send,
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { TableProps } from "antd";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface EmployeeOption {
  _id: string;
  name: string;
  username?: string;
  email: string;
  designation?: string;
  role: string;
  status: string;
}

interface SentMailRecord {
  id: string;
  subject: string;
  recipientNames: string[];
  recipientCount: number;
  timestamp: string;
  status: "Delivered" | "Sent";
}

const TEMPLATES = [
  {
    label: "📢 Company Announcement",
    subject: "Important Company Announcement",
    body: `Hello Team,\n\nPlease be advised of the following update regarding our current operations and upcoming priorities:\n\n• Point 1: \n• Point 2: \n\nPlease reach out if you have any questions.\n\nBest regards,\nManagement Team`,
  },
  {
    label: "🚀 Sprint & Project Update",
    subject: "Sprint Progress & Deliverables Update",
    body: `Hi Everyone,\n\nHere is a quick summary of our progress for the current sprint:\n\n1. Completed Features:\n2. Items Currently in Progress:\n3. Blockers or Immediate Needs:\n\nPlease ensure your tasks and work items are up to date.\n\nThank you for your hard work!`,
  },
  {
    label: "📝 Discussion & Notes",
    subject: "Notes & Action Items",
    body: `Hi Team,\n\nThank you for your time today. Below is a recap of key discussion points and action items:\n\n• Discussion Highlights:\n• Action Items & Owners:\n• Target Completion Date:\n\nLet me know if anything was missed.`,
  },
  {
    label: "⚡ Urgent Action Required",
    subject: "Urgent: Immediate Attention Required",
    body: `Dear Team Member,\n\nWe require your urgent attention regarding the following item:\n\n[Details here]\n\nPlease review and take necessary action as soon as possible today.\n\nThank you.`,
  },
];

export default function SendMailPage() {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [sentHistory, setSentHistory] = useState<SentMailRecord[]>([]);

  // Fetch employees on mount
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const res = await fetch("/api/users");
        if (res.ok) {
          const data = await res.json();
          // Filter to active employees with valid emails
          const activeList = Array.isArray(data)
            ? data.filter((u) => u.status !== "INACTIVE" && u.email)
            : [];
          setEmployees(activeList);
        } else {
          message.error("Failed to load employee list");
        }
      } catch (err) {
        console.error("Fetch employees error:", err);
      } finally {
        setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [message]);

  // Select all employees handler
  const handleSelectAll = () => {
    const allEmails = employees.map((e) => e.email);
    setSelectedEmails(allEmails);
    form.setFieldsValue({ recipients: allEmails });
    message.info(`Selected all ${allEmails.length} active employees`);
  };

  // Clear all recipients handler
  const handleClearAll = () => {
    setSelectedEmails([]);
    form.setFieldsValue({ recipients: [] });
  };

  // Apply template handler
  const handleApplyTemplate = (tpl: typeof TEMPLATES[0]) => {
    form.setFieldsValue({
      subject: tpl.subject,
      body: tpl.body,
    });
    message.success(`Applied template: ${tpl.label}`);
  };

  // Send mail handler
  const handleSend = async (values: any) => {
    const { recipients, subject, body } = values;

    if (!recipients || recipients.length === 0) {
      message.error("Please select at least one recipient");
      return;
    }

    setSending(true);
    try {
      // Map selected emails back to employee names for rich payload
      const recipientObjects = recipients.map((email: string) => {
        const emp = employees.find((e) => e.email === email);
        return {
          name: emp ? emp.name : email,
          email,
        };
      });

      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: recipientObjects,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(data.message || `Mail dispatched to ${recipients.length} employee(s)!`);

        // Add to history
        const newRecord: SentMailRecord = {
          id: Date.now().toString(),
          subject: subject.trim(),
          recipientNames: recipientObjects.map((r: any) => r.name),
          recipientCount: recipients.length,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "Delivered",
        };

        setSentHistory((prev) => [newRecord, ...prev]);

        // Reset form fields except recipients
        form.resetFields(["subject", "body"]);
      } else {
        message.error(data.error || "Failed to send email");
      }
    } catch (err: any) {
      message.error(err.message || "Network error while sending email");
    } finally {
      setSending(false);
    }
  };

  const historyColumns: TableProps<SentMailRecord>["columns"] = [
    {
      title: "Subject",
      dataIndex: "subject",
      key: "subject",
      render: (subj: string) => <Text strong>{subj}</Text>,
    },
    {
      title: "Recipients",
      dataIndex: "recipientNames",
      key: "recipientNames",
      render: (names: string[], record) => (
        <Tooltip title={names.join(", ")}>
          <Tag color="blue" icon={<Users size={12} style={{ verticalAlign: -1, marginRight: 4 }} />}>
            {record.recipientCount === employees.length && employees.length > 1
              ? "All Employees"
              : `${record.recipientCount} Employee${record.recipientCount > 1 ? "s" : ""}`}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: "Time",
      dataIndex: "timestamp",
      key: "timestamp",
      render: (time: string) => (
        <Space size={4}>
          <Clock size={13} color="#8c8c8c" />
          <Text type="secondary" style={{ fontSize: 12 }}>{time}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: () => (
        <Badge
          status="success"
          text={<Text style={{ color: "#52c41a", fontWeight: 500 }}>Delivered</Text>}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <Mail size={26} color="#00897b" />
          Send Email
        </Title>
        <Text type="secondary">
          Search employees by name to auto-fetch their email, or broadcast announcements to the entire team.
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Main Composer */}
        <Col xs={24} lg={16}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
            }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSend}
            >
              {/* Recipients Input */}
              <Form.Item
                name="recipients"
                label={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                    <span style={{ fontWeight: 600 }}>Select Recipients (Search by Name)</span>
                    <Space size={8}>
                      <Button
                        type="link"
                        size="small"
                        icon={<UserCheck size={14} />}
                        onClick={handleSelectAll}
                        style={{ color: "#00897b", padding: 0 }}
                      >
                        Select All Employees ({employees.length})
                      </Button>
                      {selectedEmails.length > 0 && (
                        <>
                          <Text type="secondary">|</Text>
                          <Button
                            type="link"
                            size="small"
                            danger
                            onClick={handleClearAll}
                            style={{ padding: 0 }}
                          >
                            Clear
                          </Button>
                        </>
                      )}
                    </Space>
                  </div>
                }
                rules={[{ required: true, message: "Please select at least one recipient" }]}
                extra="Start typing an employee's name to look up their email address automatically."
              >
                <Select
                  mode="multiple"
                  placeholder="Type an employee name (e.g. Rahul, Daksh)..."
                  loading={loadingEmployees}
                  value={selectedEmails}
                  onChange={(val) => setSelectedEmails(val)}
                  style={{ width: "100%", borderRadius: 8 }}
                  filterOption={(input, option) => {
                    const label = (option?.label as string) || "";
                    const value = (option?.value as string) || "";
                    return (
                      label.toLowerCase().includes(input.toLowerCase()) ||
                      value.toLowerCase().includes(input.toLowerCase())
                    );
                  }}
                  tagRender={(props) => {
                    const emp = employees.find((e) => e.email === props.value);
                    return (
                      <Tag
                        closable={props.closable}
                        onClose={props.onClose}
                        color="cyan"
                        style={{ marginRight: 4, marginTop: 2, marginBottom: 2, borderRadius: 4 }}
                      >
                        <strong>{emp ? emp.name : props.value}</strong>
                        <span style={{ opacity: 0.75, marginLeft: 4, fontSize: 11 }}>({props.value})</span>
                      </Tag>
                    );
                  }}
                >
                  {employees.map((emp) => (
                    <Option
                      key={emp._id || emp.email}
                      value={emp.email}
                      label={`${emp.name} ${emp.email} ${emp.designation || ""}`}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <Text strong>{emp.name}</Text>
                          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                            {emp.email}
                          </Text>
                        </div>
                        {emp.designation && (
                          <Tag style={{ fontSize: 10 }}>{emp.designation}</Tag>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Subject */}
              <Form.Item
                name="subject"
                label={<span style={{ fontWeight: 600 }}>Subject</span>}
                rules={[{ required: true, message: "Please enter the email subject" }]}
              >
                <Input
                  size="large"
                  placeholder="e.g. Project Sprint Status & Deliverables"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              {/* Body */}
              <Form.Item
                name="body"
                label={<span style={{ fontWeight: 600 }}>Message Body</span>}
                rules={[{ required: true, message: "Please enter your message" }]}
              >
                <TextArea
                  rows={8}
                  placeholder="Write your email message here..."
                  style={{ borderRadius: 8, fontSize: 14 }}
                />
              </Form.Item>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedEmails.length > 0
                    ? `Ready to deliver to ${selectedEmails.length} recipient${selectedEmails.length > 1 ? "s" : ""}.`
                    : "Select recipients above to begin."}
                </Text>

                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  icon={<Send size={16} />}
                  loading={sending}
                  style={{
                    backgroundColor: "#00897b",
                    borderColor: "#00897b",
                    borderRadius: 8,
                    height: 44,
                    padding: "0 28px",
                    fontWeight: 600,
                    boxShadow: "0 4px 12px rgba(0, 137, 123, 0.25)",
                  }}
                >
                  Send Email
                </Button>
              </div>
            </Form>
          </Card>
        </Col>

        {/* Sidebar Helpers: Quick Templates & Session History */}
        <Col xs={24} lg={8}>
          <Space orientation="vertical" size={20} style={{ width: "100%" }}>
            {/* Quick Templates Card */}
            <Card
              title={
                <Space size={8}>
                  <Sparkles size={18} color="#00897b" />
                  <span style={{ fontSize: 15 }}>Quick Message Templates</span>
                </Space>
              }
              variant="borderless"
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
              }}
            >
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
                Click any template to auto-populate the subject and body text:
              </Paragraph>
              <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                {TEMPLATES.map((tpl, idx) => (
                  <Button
                    key={idx}
                    block
                    style={{ textAlign: "left", height: "auto", padding: "10px 14px", borderRadius: 8 }}
                    onClick={() => handleApplyTemplate(tpl)}
                  >
                    <div>
                      <Text strong style={{ fontSize: 13, display: "block" }}>
                        {tpl.label}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {tpl.subject}
                      </Text>
                    </div>
                  </Button>
                ))}
              </Space>
            </Card>

            {/* Sent Emails in this Session */}
            <Card
              title={
                <Space size={8}>
                  <CheckCircle2 size={18} color="#52c41a" />
                  <span style={{ fontSize: 15 }}>Recent Dispatches</span>
                </Space>
              }
              variant="borderless"
              style={{
                borderRadius: 12,
                boxShadow: "0 4px 14px rgba(0, 0, 0, 0.05)",
              }}
            >
              {sentHistory.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    No emails dispatched in this session yet.
                  </Text>
                </div>
              ) : (
                <Table
                  dataSource={sentHistory}
                  columns={historyColumns}
                  rowKey="id"
                  size="small"
                  pagination={false}
                />
              )}
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
