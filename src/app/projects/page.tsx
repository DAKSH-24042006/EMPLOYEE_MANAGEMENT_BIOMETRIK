"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { ColumnsType } from "antd/es/table";
import {
  Typography,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  DatePicker,
  Tooltip,
  App,
  Skeleton,
  Row,
  Col,
  Card,
  Divider,
  Checkbox,
  Grid,
  List,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  FilePdfOutlined,
  EyeOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import Link from "next/link";
import { generateProjectPDF } from "@/lib/reportUtils";
import { Role } from "@/lib/constants";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;
const { Option } = Select;

// ─── Types ───────────────────────────────────────────────────────────────────

interface IProject {
  _id: string;
  title: string;
  clientDetails: {
    companyName: string;
    contactPerson?: string;
    email: string;
    contactNumber?: string;
  };
  features: {
    visitorManagement: boolean;
    attendanceManagement: boolean;
    digilockerAuthentication: boolean;
    webApp: boolean;
    androidApp: boolean;
    iosApp: boolean;
    videoKYC: boolean;
    rbac: boolean;
    adminPanel: boolean;
    online: boolean;
    offline: boolean;
    cloud: boolean;
    onPremise: boolean;
  };
  extraAddOns?: string;
  timeline: {
    startDate: string;
    endDate: string;
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  
  // Enriched fields
  createdBy?: {
    name: string;
    email: string;
    role: string;
  };
  techOwner?: {
    name: string;
    email: string;
    role: string;
  };
  openBlockersCount?: number;
  progressPercent?: number;
  overdueWorkItemsCount?: number;
  activeSprint?: string;
  requirementCompletenessScore?: number;
  pendingSignoff?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { color: string; icon: React.ReactNode }
> = {
  "Requirement Created": { color: "blue", icon: <ClockCircleOutlined /> },
  "Submitted for Tech Review": { color: "cyan", icon: <SyncOutlined /> },
  "Clarification Required": { color: "orange", icon: <ExclamationCircleOutlined /> },
  "Technically Approved": { color: "purple", icon: <CheckCircleOutlined /> },
  "Planning": { color: "geekblue", icon: <SyncOutlined /> },
  "Development": { color: "indigo", icon: <SyncOutlined /> },
  "Testing/UAT": { color: "warning", icon: <SyncOutlined /> },
  "Signoff Pending": { color: "magenta", icon: <SyncOutlined /> },
  "Delivered": { color: "success", icon: <CheckCircleOutlined /> },
  "Closed": { color: "default", icon: <CheckCircleOutlined /> },
  Pending: { color: "orange", icon: <ClockCircleOutlined /> },
  Active: { color: "blue", icon: <SyncOutlined /> },
  Completed: { color: "green", icon: <CheckCircleOutlined /> }
};

const FEATURE_LABELS: Record<string, string> = {
  visitorManagement: "Visitor Mgmt",
  attendanceManagement: "Attendance Mgmt",
  digilockerAuthentication: "Digilocker",
  webApp: "Web App",
  androidApp: "Android",
  iosApp: "iOS",
  videoKYC: "Video KYC",
  rbac: "RBAC System",
  adminPanel: "Admin Panel",
  online: "Online",
  offline: "Offline",
  cloud: "Cloud",
  onPremise: "On Premise",
};



// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  open: boolean;
  project: IProject | null;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ open, project, onClose, onSaved }: EditModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const { message } = App.useApp();

  // Populate form when project changes
  useEffect(() => {
    if (project && open) {
      form.setFieldsValue({
        companyName: project.clientDetails.companyName,
        contactPerson: project.clientDetails.contactPerson || "",
        email: project.clientDetails.email,
        contactNumber: project.clientDetails.contactNumber || "",
        visitorManagement: project.features.visitorManagement,
        attendanceManagement: project.features.attendanceManagement,
        digilockerAuthentication: project.features.digilockerAuthentication,
        webApp: project.features.webApp,
        androidApp: project.features.androidApp,
        iosApp: project.features.iosApp,
        videoKYC: project.features.videoKYC,
        rbac: project.features.rbac,
        adminPanel: project.features.adminPanel,
        online: project.features.online,
        offline: project.features.offline,
        cloud: project.features.cloud,
        onPremise: project.features.onPremise,
        extraAddOns: project.extraAddOns || "",
        status: project.status,
        startDate: dayjs(project.timeline.startDate),
        endDate: dayjs(project.timeline.endDate),
      });
    }
  }, [project, open, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const body = {
        companyName: values.companyName,
        contactPerson: values.contactPerson,
        email: values.email,
        contactNumber: values.contactNumber,
        visitorManagement: values.visitorManagement ?? false,
        attendanceManagement: values.attendanceManagement ?? false,
        digilockerAuthentication: values.digilockerAuthentication ?? false,
        webApp: values.webApp ?? false,
        androidApp: values.androidApp ?? false,
        iosApp: values.iosApp ?? false,
        videoKYC: values.videoKYC ?? false,
        rbac: values.rbac ?? false,
        adminPanel: values.adminPanel ?? false,
        online: values.online ?? false,
        offline: values.offline ?? false,
        cloud: values.cloud ?? false,
        onPremise: values.onPremise ?? false,
        extraAddOns: values.extraAddOns,
        status: values.status,
        timeline: [
          values.startDate?.toISOString(),
          values.endDate?.toISOString(),
        ],
      };

      const res = await fetch(`/api/projects/${project!._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok) {
        message.success("Project updated successfully!");
        onSaved();
        onClose();
      } else {
        message.error(data.error || "Failed to update project");
      }
    } catch (err: any) {
      if (err?.errorFields) return; // antd validation error
      message.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <EditOutlined style={{ color: "#00897b" }} />
          <span style={{ fontWeight: 600 }}>Edit Project</span>
          {project && (
            <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
              — {project.clientDetails.companyName}
            </Text>
          )}
        </Space>
      }
      onCancel={onClose}
      onOk={handleSave}
      okText="Save Changes"
      confirmLoading={saving}
      okButtonProps={{ style: { background: "#00897b", borderColor: "#00897b" } }}
      width={760}
      destroyOnHidden
    >
      <Divider style={{ margin: "12px 0 20px" }} />
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          visitorManagement: false,
          attendanceManagement: false,
          digilockerAuthentication: false,
          webApp: false,
          androidApp: false,
          iosApp: false,
          videoKYC: false,
          rbac: false,
          adminPanel: false,
          online: false,
          offline: false,
          cloud: false,
          onPremise: false,
        }}
      >
        {/* Client Details */}
        <Title level={5} style={{ marginBottom: 16, color: "#374151" }}>
          Client Details
        </Title>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item
              name="companyName"
              label="Company Name"
              rules={[{ required: true, message: "Company name is required" }]}
            >
              <Input placeholder="E.g., Acme Corp" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="contactPerson" label="Contact Person">
              <Input placeholder="E.g., Jane Doe" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="email"
              label="Contact Email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input placeholder="jane@acme.com" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="contactNumber"
              label="Contact Number"
              rules={[
                { pattern: /^[0-9]*$/, message: "Please enter only digits" },
                { len: 10, message: "Contact number must be exactly 10 digits" }
              ]}
            >
              <Input
                placeholder="E.g., 9876543210"
                maxLength={10}
                onKeyPress={(e) => {
                  if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* Timeline + Status */}
        <Row gutter={16}>
          <Col xs={24} md={14}>
            <Form.Item
              label="Project Timeline"
              required
              style={{ marginBottom: 0 }}
            >
              <Row gutter={8}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="startDate"
                    rules={[{ required: true, message: "Start date is required" }]}
                    style={{ marginBottom: 8 }}
                  >
                    <DatePicker
                      placeholder="Start Date"
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="endDate"
                    rules={[{ required: true, message: "End date is required" }]}
                    style={{ marginBottom: 8 }}
                  >
                    <DatePicker
                      placeholder="End Date"
                      style={{ width: "100%" }}
                      format="DD/MM/YYYY"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name="status" label="Status">
              <Select>
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <Option key={s} value={s}>
                    <Tag color={STATUS_CONFIG[s].color} style={{ marginRight: 0 }}>
                      {s}
                    </Tag>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        {/* Features */}
        <Title level={5} style={{ marginBottom: 12, color: "#374151" }}>
          Application Features
        </Title>
        <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
          {(
            Object.keys(FEATURE_LABELS) as Array<keyof IProject["features"]>
          ).map((key) => (
            <Col xs={12} sm={8} md={8} key={key}>
              <Form.Item
                name={key}
                valuePropName="checked"
                style={{ margin: 0 }}
              >
                <Checkbox style={{ fontSize: 13 }}>
                  {FEATURE_LABELS[key]}
                </Checkbox>
              </Form.Item>
            </Col>
          ))}
        </Row>

        {/* Extra Add-ons */}
        <Form.Item name="extraAddOns" label="Extra Add-ons & Notes">
          <TextArea
            rows={3}
            placeholder="Custom integrations, special requirements..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

// ─── Details Modal ────────────────────────────────────────────────────────────

interface ProjectDetailsModalProps {
  open: boolean;
  project: IProject | null;
  onClose: () => void;
}

function ProjectDetailsModal({ open, project, onClose, onShowPreview }: ProjectDetailsModalProps & { onShowPreview: (doc: any, filename: string) => void }) {
  const [generating, setGenerating] = useState(false);
  const { message } = App.useApp();

  const handleGeneratePDF = async () => {
    if (!project) return;
    setGenerating(true);
    try {
      const { doc, filename } = await generateProjectPDF(project);
      onShowPreview(doc, filename);
    } catch (err) {
      message.error("Failed to generate PDF report.");
    } finally {
      setGenerating(false);
    }
  };

  if (!project) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="pdf"
          type="primary"
          icon={<FilePdfOutlined />}
          loading={generating}
          onClick={handleGeneratePDF}
          style={{ background: "#00897b", borderColor: "#00897b" }}
        >
          Generate PDF Report
        </Button>,
      ]}
      title={
        <Space>
          <ProjectOutlined style={{ color: "#00897b" }} />
          <span style={{ fontWeight: 600 }}>Project Details</span>
        </Space>
      }
      width={800}
    >
      <Divider style={{ margin: "12px 0 24px" }} />

      <div style={{ padding: "0 4px" }}>
        {/* Client Section */}
        <section style={{ marginBottom: 32 }}>
          <Title level={5} style={{ color: "#00897b", marginBottom: 16 }}>
            Client Information
          </Title>
          <Card size="small" variant="borderless" style={{ background: "#f9fafb", borderRadius: 8 }}>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Company Name</Text>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                  {project.clientDetails.companyName}
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Contact Person</Text>
                <div style={{ fontSize: 15, color: "#374151" }}>
                  {project.clientDetails.contactPerson || "—"}
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Email Address</Text>
                <div style={{ fontSize: 15, color: "#374151" }}>
                  {project.clientDetails.email}
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>Contact Number</Text>
                <div style={{ fontSize: 15, color: "#374151" }}>
                  {project.clientDetails.contactNumber || "—"}
                </div>
              </Col>
            </Row>
          </Card>
        </section>

        {/* Status & Timeline */}
        <section style={{ marginBottom: 32 }}>
          <Title level={5} style={{ color: "#00897b", marginBottom: 16 }}>
            Logistics & Progress
          </Title>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={8}>
              <Card size="small" variant="borderless" style={{
                textAlign: "center",
                background: "#f0fdfa",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center"
              }}>
                <Text type="secondary" style={{ fontSize: 11 }}>Status</Text>
                <div style={{ marginTop: 4, display: "flex", justifyContent: "center" }}>
                  <Tag
                    color={STATUS_CONFIG[project.status].color}
                    icon={STATUS_CONFIG[project.status].icon}
                    style={{ margin: 0, borderRadius: 12 }}
                  >
                    {project.status}
                  </Tag>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={16}>
              <Card size="small" variant="borderless" style={{ background: "#f9fafb", height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", height: "100%" }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>Start Date</Text>
                    <div style={{ fontWeight: 500 }}>{dayjs(project.timeline.startDate).format("DD MMM YYYY")}</div>
                  </div>
                  <Divider orientation="vertical" style={{ height: 40 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>End Date</Text>
                    <div style={{ fontWeight: 500 }}>{dayjs(project.timeline.endDate).format("DD MMM YYYY")}</div>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </section>

        {/* Features Section */}
        <section style={{ marginBottom: 32 }}>
          <Title level={5} style={{ color: "#00897b", marginBottom: 16 }}>
            Application Features
          </Title>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(project.features)
              .filter(([_, enabled]) => enabled)
              .map(([key, _]) => (
                <Tag key={key} style={{ padding: "4px 12px", borderRadius: 4, background: "#fff", border: "1px solid #d1d5db" }}>
                  {FEATURE_LABELS[key as keyof IProject["features"]]}
                </Tag>
              ))}
            {Object.values(project.features).every(v => !v) && (
              <Text type="secondary">No features selected.</Text>
            )}
          </div>
        </section>

        {/* Notes */}
        {project.extraAddOns && (
          <section>
            <Title level={5} style={{ color: "#00897b", marginBottom: 16 }}>
              Additional Notes
            </Title>
            <div style={{
              background: "#fffbeb",
              padding: 16,
              borderRadius: 8,
              border: "1px solid #fde68a",
              whiteSpace: "pre-wrap",
              color: "#92400e"
            }}>
              {project.extraAddOns}
            </div>
          </section>
        )}
      </div>
    </Modal>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

interface ReportPreviewModalProps {
  open: boolean;
  url: string | null;
  filename: string;
  onClose: () => void;
}

function ReportPreviewModal({ open, url, filename, onClose }: ReportPreviewModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <FilePdfOutlined style={{ color: "#ef4444" }} />
          <span style={{ fontWeight: 600 }}>Report Preview</span>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
            — {filename}
          </Text>
        </Space>
      }
      width={1000}
      styles={{ body: { padding: 0, height: "75vh", overflow: "hidden" } }}
      footer={[
        <Button key="close" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<FilePdfOutlined />}
          style={{ background: "#00897b", borderColor: "#00897b" }}
          onClick={() => {
            const link = document.createElement("a");
            link.href = url!;
            link.download = filename;
            link.click();
            onClose();
          }}
        >
          Download PDF
        </Button>,
      ]}
    >
      {url ? (
        <iframe
          src={`${url}#toolbar=0`}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="PDF Preview"
        />
      ) : (
        <div style={{ padding: 40, textAlign: "center" }}>
          <Skeleton active />
        </div>
      )}
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [editTarget, setEditTarget] = useState<IProject | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<IProject | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    setMounted(true);
    fetch("/api/user/me")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role) {
          setCurrentUserRole(data.user.role);
        }
      })
      .catch((err) => console.error("Error fetching user role:", err));
  }, []);

  const isMobile = mounted && !screens.md;
  const isTouchDevice = typeof window !== "undefined" && navigator.maxTouchPoints > 0;

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (res.status === 401) {
        message.error("Session expired. Please log in again.");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setProjects(data.data || []);
      } else {
        message.error(data.error || "Failed to load projects");
      }
    } catch {
      message.error("Network error. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    fetchProjects();
    const onFocus = () => {
      fetchProjects();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchProjects]);

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = (project: IProject) => {
    modal.confirm({
      title: "Delete Project?",
      icon: <ExclamationCircleOutlined style={{ color: "#ef4444" }} />,
      content: (
        <div>
          <p>
            You are about to permanently delete the project for{" "}
            <strong>{project.clientDetails.companyName}</strong>.
          </p>
          <p style={{ color: "#6b7280", fontSize: 13 }}>
            This action cannot be undone. All associated data will be lost.
          </p>
        </div>
      ),
      okText: "Yes, Delete",
      cancelText: "Cancel",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const res = await fetch(`/api/projects/${project._id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (res.ok) {
            message.success("Project deleted successfully.");
            setProjects((prev) => prev.filter((p) => p._id !== project._id));
          } else {
            message.error(data.error || "Failed to delete project.");
          }
        } catch {
          message.error("Network error. Please try again.");
        }
      },
    });
  };

  // ── Edit ──────────────────────────────────────────────────────────────────

  const openEdit = (project: IProject) => {
    document.body.click(); // Programmatically force-close any open tooltips
    setEditTarget(project);
    setEditOpen(true);
  };

  const openDetails = (project: IProject) => {
    document.body.click(); // Programmatically force-close any open tooltips
    setDetailTarget(project);
    setDetailOpen(true);
  };

  // ── Summary cards ─────────────────────────────────────────────────────────

  const statusCounts = {
    total: projects.length,
    active: projects.filter((p) => p.status === "Active").length,
    pending: projects.filter((p) => p.status === "Pending").length,
    completed: projects.filter((p) => p.status === "Completed").length,
  };

  // ── Table columns ─────────────────────────────────────────────────────────

    const isSystemAdmin =
    currentUserRole === Role.SYSTEM_ADMIN ||
    currentUserRole === "ADMIN" ||
    currentUserRole === "SYSTEM_ADMIN";

  const columns: ColumnsType<IProject> = [
    {
      title: "Project & Client",
      key: "project_client",
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (_, record) => (
        <div>
          <Link href={`/projects/${record._id}`}>
            <div style={{ fontWeight: 600, color: "#00897b", fontSize: 13, cursor: "pointer" }}>
              {record.title || "Unnamed Project"}
            </div>
          </Link>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            Client: {record.clientDetails.companyName}
          </div>
        </div>
      ),
    },
    {
      title: "Timeline",
      key: "timeline",
      responsive: ["sm"] as any,
      render: (_, record) => (
        <div style={{ whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 11, color: "#374151" }}>
            <span style={{ color: "#6b7280" }}>From: </span>
            {dayjs(record.timeline.startDate).format("DD MMM YYYY")}
          </div>
          <div style={{ fontSize: 11, color: "#374151" }}>
            <span style={{ color: "#6b7280" }}>To: </span>
            {dayjs(record.timeline.endDate).format("DD MMM YYYY")}
          </div>
        </div>
      ),
    },
    ...(isSystemAdmin
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (_: any, record: IProject) => {
              const anyModalOpen = editOpen || detailOpen;
              const shouldForceClose = anyModalOpen || isTouchDevice;

              const handleSafeClick = (cb: () => void) => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                document.body.click();
                cb();
              };

              return (
                <Space>
                  <Tooltip
                    title="View Details"
                    trigger="hover"
                    open={shouldForceClose ? false : undefined}
                    destroyOnHidden
                  >
                    <Link href={`/projects/${record._id}`}>
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        style={{ color: "#6366f1" }}
                      />
                    </Link>
                  </Tooltip>

                  <Tooltip
                    title="Edit Project"
                    trigger="hover"
                    open={shouldForceClose ? false : undefined}
                    destroyOnHidden
                  >
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleSafeClick(() => openEdit(record))}
                      style={{ color: "#00897b" }}
                    />
                  </Tooltip>

                  <Tooltip
                    title="Delete Project"
                    trigger="hover"
                    open={shouldForceClose ? false : undefined}
                    destroyOnHidden
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleSafeClick(() => handleDelete(record))}
                    />
                  </Tooltip>
                </Space>
              );
            },
          },
        ]
      : []),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, maxWidth: "100%" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
          flex: "0 0 auto"
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Projects
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Manage client projects and track progress.
          </Text>
        </div>
        <Space>
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchProjects}
              loading={loading}
            />
          </Tooltip>
          {currentUserRole === Role.SYSTEM_ADMIN && (
            <Link href="/projects/new">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ background: "#00897b", borderColor: "#00897b" }}
              >
                New Project
              </Button>
            </Link>
          )}
        </Space>
      </div>


      {/* ── Table ── */}
      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
          maxWidth: "100%"
        }}
        styles={{
          body: {
            padding: 0,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
          }
        }}
      >
        {isMobile ? (
          <div style={{ padding: "16px 12px", overflowY: "auto", flex: 1 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center" }}><Skeleton active /></div>
            ) : projects.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>No projects found</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {projects.map((project) => {
                  const anyModalOpen = editOpen || detailOpen;
                  const shouldForceClose = anyModalOpen || isTouchDevice;

                  const safeClick = (cb: () => void) => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    document.body.click();
                    cb();
                  };

                  return (
                    <Card
                      key={project._id}
                      size="small"
                      hoverable
                      style={{
                        marginBottom: 12,
                        borderRadius: 12,
                        border: "1px solid #f3f4f6",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                      }}
                      styles={{ body: { padding: "12px 16px" } }}
                      actions={[
                        <Tooltip title="View" key="view" trigger="hover" open={shouldForceClose ? false : undefined} destroyOnHidden>
                          <Link href={`/projects/${project._id}`} style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", width: "100%" }}>
                            <EyeOutlined style={{ color: "#6366f1" }} />
                          </Link>
                        </Tooltip>,
                        <Tooltip title="Edit" key="edit" trigger="hover" open={shouldForceClose ? false : undefined} destroyOnHidden>
                          <EditOutlined onClick={() => safeClick(() => openEdit(project))} style={{ color: "#00897b" }} />
                        </Tooltip>,
                        <Tooltip title="Delete" key="delete" trigger="hover" open={shouldForceClose ? false : undefined} destroyOnHidden>
                          <DeleteOutlined onClick={() => safeClick(() => handleDelete(project))} style={{ color: "#ef4444" }} />
                        </Tooltip>
                      ]}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", flex: 1, marginRight: 8 }}>
                          {project.clientDetails.companyName}
                        </div>
                        <Tag
                          color={STATUS_CONFIG[project.status].color}
                          icon={STATUS_CONFIG[project.status].icon}
                          style={{ borderRadius: 12, margin: 0, fontSize: 10, padding: "0 8px" }}
                        >
                          {project.status}
                        </Tag>
                      </div>

                      <Row gutter={[0, 8]}>
                        <Col span={24}>
                          <div style={{ fontSize: 12, color: "#4b5563", display: "flex", alignItems: "center", gap: 8 }}>
                            <ClockCircleOutlined style={{ fontSize: 12, color: "#9ca3af" }} />
                            <span><strong>Created:</strong> {dayjs(project.createdAt).format("DD MMM YYYY")}</span>
                          </div>
                        </Col>
                        <Col span={24}>
                          <div style={{ fontSize: 12, color: "#4b5563", display: "flex", alignItems: "center", gap: 8 }}>
                            <CalendarOutlined style={{ fontSize: 12, color: "#9ca3af" }} />
                            <span>
                              <strong>Timeline:</strong> {dayjs(project.timeline.startDate).format("DD MMM")} – {dayjs(project.timeline.endDate).format("DD MMM YYYY")}
                            </span>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={projects}
            rowKey="_id"
            loading={loading}
            size="middle"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (total, range) =>
                `${range[0]}–${range[1]} of ${total}`,
            }}
            locale={{
              emptyText: (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
                  <Title level={5} style={{ color: "#9ca3af" }}>
                    No projects yet
                  </Title>
                  {currentUserRole === Role.SYSTEM_ADMIN && (
                    <Link href="/projects/new">
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        style={{ marginTop: 16, background: "#00897b", borderColor: "#00897b" }}
                      >
                        New Project
                      </Button>
                    </Link>
                  )}
                </div>
              ),
            }}
            scroll={{ x: 1000, y: "calc(100vh - 320px)" }}
            style={{ borderRadius: 12 }}
          />
        )}
      </Card>

      {/* ── Edit Modal ── */}
      <EditModal
        open={editOpen}
        project={editTarget}
        onClose={() => {
          setEditOpen(false);
          setEditTarget(null);
        }}
        onSaved={fetchProjects}
      />

      {/* ── Details Modal ── */}
      <ProjectDetailsModal
        open={detailOpen}
        project={detailTarget}
        onClose={() => {
          setDetailOpen(false);
          setDetailTarget(null);
        }}
        onShowPreview={(doc, filename) => {
          const blob = doc.output("blob");
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          setPreviewFilename(filename);
          setPreviewOpen(true);
        }}
      />

      {/* ── Preview Modal ── */}
      <ReportPreviewModal
        open={previewOpen}
        url={previewUrl}
        filename={previewFilename}
        onClose={() => {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setPreviewOpen(false);
        }}
      />
    </div>
  );
}
