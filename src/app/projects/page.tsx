"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
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
  Progress,
  Avatar,
  Segmented,
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
  UserOutlined,
  RightOutlined,
  SearchOutlined,
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
  description?: string;
  clientDetails: {
    companyName: string;
    contactPerson?: string;
    email?: string;
    contactNumber?: string;
  };
  priority?: string;
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

// ─── Professional Biometrik Palette Helpers ─────────────────────────────────

function getProjectStatusStyle(status: string) {
  switch (status) {
    case "Requirement Created":
    case "Planning":
      return {
        bg: "#f0fdfa",
        color: "#0f766e",
        border: "#b2dfdb",
        dot: "#00897b",
      };
    case "Submitted for Tech Review":
    case "Signoff Pending":
      return {
        bg: "#f4f8f7",
        color: "#00695c",
        border: "#80cbc4",
        dot: "#00897b",
      };
    case "Development":
    case "Active":
      return {
        bg: "#e0f2f1",
        color: "#004d40",
        border: "#4db6ac",
        dot: "#00897b",
      };
    case "Testing/UAT":
      return {
        bg: "#f0fdf4",
        color: "#166534",
        border: "#bbf7d0",
        dot: "#22c55e",
      };
    case "Delivered":
    case "Completed":
    case "Technically Approved":
      return {
        bg: "#ecfdf5",
        color: "#065f46",
        border: "#a7f3d0",
        dot: "#10b981",
      };
    case "Clarification Required":
    case "Pending":
      return {
        bg: "#fffbeb",
        color: "#92400e",
        border: "#fde68a",
        dot: "#f59e0b",
      };
    default:
      return {
        bg: "#f3f4f6",
        color: "#374151",
        border: "#e5e7eb",
        dot: "#9ca3af",
      };
  }
}

function getProjectPriorityStyle(priority: string = "Medium") {
  switch (priority.toLowerCase()) {
    case "critical":
      return {
        bg: "#fef2f2",
        color: "#991b1b",
        border: "#fecaca",
      };
    case "high":
      return {
        bg: "#fff7ed",
        color: "#9a3412",
        border: "#fed7aa",
      };
    case "medium":
      return {
        bg: "#f0fdfa",
        color: "#0f766e",
        border: "#ccfbf1",
      };
    default:
      return {
        bg: "#f8fafc",
        color: "#475569",
        border: "#e2e8f0",
      };
  }
}

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
        title: project.title || "",
        description: project.description || "",
        timeline: project.timeline?.startDate && project.timeline?.endDate
          ? [dayjs(project.timeline.startDate), dayjs(project.timeline.endDate)]
          : undefined,
        priority: project.priority || "Medium",
        status: project.status,
      });
    }
  }, [project, open, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const body = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status,
        timeline: values.timeline
          ? [values.timeline[0].toISOString(), values.timeline[1].toISOString()]
          : undefined,
      };

      const res = await fetch(`/api/projects/${project!._id}`, {
        method: "PATCH",
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
          <span style={{ fontWeight: 600 }}>Edit Project Specifications</span>
        </Space>
      }
      onCancel={onClose}
      onOk={handleSave}
      okText="Save Changes"
      confirmLoading={saving}
      okButtonProps={{ style: { background: "#00897b", borderColor: "#00897b" } }}
      width={560}
      destroyOnHidden
    >
      <Divider style={{ margin: "12px 0 20px" }} />
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          name="title"
          label="Requirement / Project Title"
          rules={[{ required: true, message: "Project title is required" }]}
        >
          <Input placeholder="E.g., Requirement Dashboard" />
        </Form.Item>

        <Form.Item name="description" label="Project Description">
          <TextArea rows={3} placeholder="Project overview, scope, and objectives..." />
        </Form.Item>

        <Form.Item
          name="timeline"
          label="Timeline Dates"
          rules={[{ required: true, message: "Timeline dates are required" }]}
        >
          <RangePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="priority"
              label="Priority"
              rules={[{ required: true, message: "Priority is required" }]}
            >
              <Select
                options={[
                  { label: "Low", value: "Low" },
                  { label: "Medium", value: "Medium" },
                  { label: "High", value: "High" },
                  { label: "Critical", value: "Critical" },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="status"
              label="Project Status"
              rules={[{ required: true, message: "Status is required" }]}
            >
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed">("all");
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

  // ── Project Filtering & Metrics ──────────────────────────────────────────

  const isProjectCompleted = (status: string) =>
    ["Completed", "Delivered", "Closed"].includes(status);

  const totalCount = projects.length;
  const activeCount = projects.filter((p) => !isProjectCompleted(p.status)).length;
  const completedCount = projects.filter((p) => isProjectCompleted(p.status)).length;

  const filteredProjects = projects.filter((project) => {
    if (statusFilter === "active" && isProjectCompleted(project.status)) return false;
    if (statusFilter === "completed" && !isProjectCompleted(project.status)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const title = (project.title || "").toLowerCase();
      const client = (project.clientDetails?.companyName || "").toLowerCase();
      const desc = (project.description || "").toLowerCase();
      const pm = (project.techOwner?.name || "").toLowerCase();
      if (!title.includes(q) && !client.includes(q) && !desc.includes(q) && !pm.includes(q)) {
        return false;
      }
    }
    return true;
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, maxWidth: "100%" }}>
      {/* ── Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
          flex: "0 0 auto",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 700, color: "#111827" }}>
              Projects
            </Title>
            <span
              style={{
                background: "#f0fdfa",
                border: "1px solid #ccfbf1",
                color: "#00796b",
                fontWeight: 600,
                borderRadius: 12,
                padding: "2px 8px",
                fontSize: 11,
              }}
            >
              {totalCount} Total
            </span>
          </div>
          <Text type="secondary" style={{ fontSize: 12, color: "#6b7280" }}>
            Manage client projects, specifications, and track execution progress.
          </Text>
        </div>

        <Space wrap size={10}>
          <Input
            placeholder="Search projects or clients..."
            prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 220, borderRadius: 8 }}
          />
          <Tooltip title="Refresh">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              onClick={fetchProjects}
              loading={loading}
              style={{ borderRadius: 8 }}
            >
              Refresh
            </Button>
          </Tooltip>
          {currentUserRole === Role.SYSTEM_ADMIN && (
            <Link href="/projects/new">
              <Button
                type="primary"
                icon={<PlusOutlined />}
                style={{ background: "#00897b", borderColor: "#00897b", borderRadius: 8, fontWeight: 500 }}
              >
                New Project
              </Button>
            </Link>
          )}
        </Space>
      </div>

      {/* ── Quick Filter Tabs ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 16,
          flex: "0 0 auto",
        }}
      >
        <Segmented
          value={statusFilter}
          onChange={(val) => setStatusFilter(val as any)}
          options={[
            { label: `All Projects (${totalCount})`, value: "all" },
            { label: `Active (${activeCount})`, value: "active" },
            { label: `Delivered (${completedCount})`, value: "completed" },
          ]}
          style={{ background: "#f3f4f6", padding: 3, borderRadius: 8 }}
        />
      </div>

      {/* ── Content View (Cards) ── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24, paddingRight: 4 }}>
        {loading ? (
          <Row gutter={[16, 16]} style={{ marginLeft: 0, marginRight: 0 }}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Col xs={24} sm={12} lg={8} key={i}>
                <Card style={{ borderRadius: 14, border: "1px solid #e5e7eb" }}>
                  <Skeleton active paragraph={{ rows: 5 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : filteredProjects.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", background: "#fff", borderRadius: 14, border: "1px dashed #d9d9d9" }}>
            <div style={{ fontSize: 42, marginBottom: 12, color: "#9ca3af" }}>
              <ProjectOutlined />
            </div>
            <Title level={4} style={{ color: "#374151", margin: 0 }}>
              {searchQuery || statusFilter !== "all" ? "No matching projects found" : "No projects found"}
            </Title>
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: "block" }}>
              {searchQuery || statusFilter !== "all"
                ? "Try clearing your search query or switching filters."
                : "Get started by creating a new client project."}
            </Text>
            {searchQuery || statusFilter !== "all" ? (
              <div style={{ marginTop: 16 }}>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  style={{ borderRadius: 8 }}
                >
                  Reset Filter
                </Button>
              </div>
            ) : (
              currentUserRole === Role.SYSTEM_ADMIN && (
                <div style={{ marginTop: 16 }}>
                  <Link href="/projects/new">
                    <Button type="primary" icon={<PlusOutlined />} style={{ background: "#00897b", borderColor: "#00897b", borderRadius: 8 }}>
                      New Project
                    </Button>
                  </Link>
                </div>
              )
            )}
          </div>
        ) : (
          <Row gutter={[16, 16]} style={{ marginLeft: 0, marginRight: 0 }}>
            {filteredProjects.map((project) => {
              const statusStyle = getProjectStatusStyle(project.status);
              const pct = project.progressPercent || 0;
              const priority = project.priority || "Medium";
              const priorityStyle = getProjectPriorityStyle(priority);

              // Calculate relative timeline
              const endDate = dayjs(project.timeline?.endDate);
              const diffDays = endDate.diff(dayjs(), "day");
              const isOverdue = diffDays < 0;
              const daysRemainingText = isOverdue
                ? `${Math.abs(diffDays)}d overdue`
                : diffDays === 0
                ? "Due today"
                : `${diffDays}d remaining`;

              const safeClick = (cb: () => void) => {
                if (document.activeElement instanceof HTMLElement) {
                  document.activeElement.blur();
                }
                document.body.click();
                cb();
              };

              return (
                <Col xs={24} sm={12} lg={8} key={project._id}>
                  <Card
                    hoverable
                    className="project-card-interactive"
                    style={{
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      background: "#ffffff",
                    }}
                    styles={{
                      body: {
                        padding: "18px 20px",
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        justifyContent: "space-between",
                      },
                    }}
                  >
                    <div>
                      {/* 1. Project Title & Company Name */}
                      <div style={{ marginBottom: 10 }}>
                        <Link href={`/projects/${project._id}`}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: "#00897b",
                              lineHeight: 1.35,
                              cursor: "pointer",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={project.title || project.clientDetails?.companyName || "Unnamed Project"}
                          >
                            {project.title || project.clientDetails?.companyName || "Unnamed Project"}
                          </div>
                        </Link>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                          {project.clientDetails?.companyName || "Client Project"}
                        </div>
                      </div>

                      {/* 2. Professional Status and Priority Badges (Biometrik Palette) */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            borderRadius: 14,
                            padding: "2px 9px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: statusStyle.dot,
                              display: "inline-block",
                            }}
                          />
                          {project.status || "Active"}
                        </div>

                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: priorityStyle.bg,
                            color: priorityStyle.color,
                            border: `1px solid ${priorityStyle.border}`,
                            borderRadius: 14,
                            padding: "2px 9px",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {priority} Priority
                        </div>
                      </div>

                      {/* 3. Project Description */}
                      <div
                        style={{
                          fontSize: 12,
                          color: "#4b5563",
                          lineHeight: "19px",
                          marginBottom: 14,
                          minHeight: 38,
                          maxHeight: 57,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          background: "#f9fafb",
                          padding: "8px 12px",
                          borderRadius: 8,
                          border: "1px solid #f3f4f6",
                        }}
                        title={project.description || "No description provided"}
                      >
                        {project.description ? (
                          project.description
                        ) : (
                          <span style={{ fontStyle: "italic", color: "#9ca3af" }}>
                            Enterprise software development and digital transformation platform.
                          </span>
                        )}
                      </div>

                      {/* 4. Overall Progress */}
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, marginBottom: 5 }}>
                          <span style={{ color: "#6b7280", fontWeight: 500 }}>Overall Progress</span>
                          <span style={{ fontWeight: 700, color: pct === 100 ? "#047857" : "#00897b" }}>
                            {pct}%
                          </span>
                        </div>
                        <Progress
                          percent={pct}
                          showInfo={false}
                          strokeColor={pct === 100 ? "#10b981" : "#00897b"}
                          trailColor="#f3f4f6"
                          size={["100%", 6]}
                        />
                      </div>

                      {/* 5. Metadata: Due Date & Timeline (Sprint & Blockers removed) */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            color: "#4b5563",
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            borderRadius: 6,
                            padding: "3px 8px",
                          }}
                        >
                          <CalendarOutlined style={{ color: "#00897b" }} />
                          <span>Due: {dayjs(project.timeline?.endDate).format("DD MMM YYYY")}</span>
                        </div>

                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            color: isOverdue ? "#b91c1c" : "#6b7280",
                          }}
                        >
                          {daysRemainingText}
                        </span>
                      </div>
                    </div>

                    {/* 6. Footer: Project Lead and Workspace Action */}
                    <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12, marginTop: "auto" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.5px" }}>
                            Project Manager
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <Avatar
                              size={22}
                              style={{ backgroundColor: "#00897b", fontSize: 11, fontWeight: 600 }}
                            >
                              {(project.techOwner?.name || "Daksh Sheregar").charAt(0).toUpperCase()}
                            </Avatar>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                              {project.techOwner?.name ? project.techOwner.name : "Daksh Sheregar"}
                            </span>
                          </div>
                        </div>

                        <Space size={6}>
                          <Link href={`/projects/${project._id}`}>
                            <Button
                              type="primary"
                              className="workspace-btn"
                              style={{
                                fontSize: 12,
                                fontWeight: 500,
                                borderRadius: 6,
                                height: 32,
                                padding: "0 12px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span>Workspace</span>
                              <RightOutlined style={{ fontSize: 10 }} />
                            </Button>
                          </Link>

                          {currentUserRole === Role.SYSTEM_ADMIN && (
                            <>
                              <Tooltip title="Edit Specifications">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={() => safeClick(() => openEdit(project))}
                                  style={{ color: "#00897b" }}
                                />
                              </Tooltip>
                              <Tooltip title="Delete Project">
                                <Button
                                  size="small"
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => safeClick(() => handleDelete(project))}
                                />
                              </Tooltip>
                            </>
                          )}
                        </Space>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

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
