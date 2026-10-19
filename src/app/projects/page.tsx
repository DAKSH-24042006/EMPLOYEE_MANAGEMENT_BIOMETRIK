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
import {
  Role,
  CANONICAL_PROJECT_LIFECYCLE,
  normalizeProjectStatus,
  ProjectLifecycleStatus,
} from "@/lib/constants";

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

const STATUS_CONFIG: Record<string, { color: string; icon: React.ReactNode }> = {
  "Requirement Created": { color: "blue", icon: <ClockCircleOutlined /> },
  "Submitted for Tech Review": { color: "cyan", icon: <SyncOutlined /> },
  "Clarification Required": { color: "orange", icon: <ExclamationCircleOutlined /> },
  "Technically Approved": { color: "purple", icon: <CheckCircleOutlined /> },
  Planning: { color: "geekblue", icon: <SyncOutlined /> },
  Development: { color: "indigo", icon: <SyncOutlined /> },
  "Testing/UAT": { color: "warning", icon: <SyncOutlined /> },
  "Signoff Pending": { color: "magenta", icon: <SyncOutlined /> },
  Delivered: { color: "success", icon: <CheckCircleOutlined /> },
  Closed: { color: "default", icon: <CheckCircleOutlined /> },
  Pending: { color: "orange", icon: <ClockCircleOutlined /> },
  Active: { color: "blue", icon: <SyncOutlined /> },
  Completed: { color: "green", icon: <CheckCircleOutlined /> },
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
  const canonical = normalizeProjectStatus(status);
  switch (canonical) {
    case "In Progress":
      return {
        bg: "#E6F7F5",
        color: "#00796B",
        border: "#B2DFDB",
        dot: "#009587",
      };
    case "On Hold (Backlogged)":
      return {
        bg: "#FFF7ED",
        color: "#C2410C",
        border: "#FFEDD5",
        dot: "#EA580C",
      };
    case "In Testing":
      return {
        bg: "#F5F3FF",
        color: "#6D28D9",
        border: "#DDD6FE",
        dot: "#7C3AED",
      };
    case "Live / Deployed":
      return {
        bg: "#ECFDF5",
        color: "#047857",
        border: "#A7F3D0",
        dot: "#10B981",
      };
    default:
      return {
        bg: "#E6F7F5",
        color: "#00796B",
        border: "#B2DFDB",
        dot: "#009587",
      };
  }
}

function getProjectPriorityStyle(priority: string = "Medium") {
  switch (priority.toLowerCase()) {
    case "critical":
      return {
        bg: "#FEF2F2",
        color: "#DC2626",
        border: "#FECACA",
        dot: "#DC2626",
      };
    case "high":
      return {
        bg: "#FFF7ED",
        color: "#EA580C",
        border: "#FED7AA",
        dot: "#EA580C",
      };
    case "medium":
    default:
      return {
        bg: "#EFF6FF",
        color: "#0284C7",
        border: "#BFDBFE",
        dot: "#0284C7",
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
        startDate: project.timeline?.startDate ? dayjs(project.timeline.startDate) : undefined,
        endDate: project.timeline?.endDate ? dayjs(project.timeline.endDate) : undefined,
        priority: project.priority || "Medium",
        status: normalizeProjectStatus(project.status),
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
        startDate: values.startDate ? values.startDate.toISOString() : undefined,
        endDate: values.endDate ? values.endDate.toISOString() : null,
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
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="title"
          label="Requirement / Project Title"
          rules={[{ required: true, message: "Project title is required" }]}
        >
          <Input placeholder="E.g., Kramik Portal Project" />
        </Form.Item>

        <Form.Item name="description" label="Project Description">
          <TextArea rows={3} placeholder="Project overview, scope, and objectives..." />
        </Form.Item>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="startDate"
              label="Start Date"
              rules={[{ required: true, message: "Start date is required" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="endDate" label="Finish Date (Optional)">
              <DatePicker
                style={{ width: "100%" }}
                format="DD/MM/YYYY"
                allowClear
                placeholder="No finish date"
              />
            </Form.Item>
          </Col>
        </Row>

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
                {CANONICAL_PROJECT_LIFECYCLE.map((s) => (
                  <Option key={s} value={s}>
                    {s}
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

function ProjectDetailsModal({
  open,
  project,
  onClose,
  onShowPreview,
}: ProjectDetailsModalProps & { onShowPreview: (doc: any, filename: string) => void }) {
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
          <Card
            size="small"
            variant="borderless"
            style={{ background: "#f9fafb", borderRadius: 8 }}
          >
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Company Name
                </Text>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
                  {project.clientDetails.companyName}
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Contact Person
                </Text>
                <div style={{ fontSize: 15, color: "#374151" }}>
                  {project.clientDetails.contactPerson || "—"}
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Email Address
                </Text>
                <div style={{ fontSize: 15, color: "#374151" }}>{project.clientDetails.email}</div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Contact Number
                </Text>
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
              <Card
                size="small"
                variant="borderless"
                style={{
                  textAlign: "center",
                  background: "#f0fdfa",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Status
                </Text>
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
              <Card
                size="small"
                variant="borderless"
                style={{ background: "#f9fafb", height: "100%" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Start Date
                    </Text>
                    <div style={{ fontWeight: 500 }}>
                      {project.timeline?.startDate
                        ? dayjs(project.timeline.startDate).format("DD MMM YYYY")
                        : "Not set"}
                    </div>
                  </div>
                  <Divider orientation="vertical" style={{ height: 40 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      End Date
                    </Text>
                    <div style={{ fontWeight: 500 }}>
                      {project.timeline?.endDate
                        ? dayjs(project.timeline.endDate).format("DD MMM YYYY")
                        : "Not set"}
                    </div>
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
                <Tag
                  key={key}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 4,
                    background: "#fff",
                    border: "1px solid #d1d5db",
                  }}
                >
                  {FEATURE_LABELS[key as keyof IProject["features"]]}
                </Tag>
              ))}
            {Object.values(project.features).every((v) => !v) && (
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
            <div
              style={{
                background: "#fffbeb",
                padding: 16,
                borderRadius: 8,
                border: "1px solid #fde68a",
                whiteSpace: "pre-wrap",
                color: "#92400e",
              }}
            >
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
  const [statusFilter, setStatusFilter] = useState<"all" | ProjectLifecycleStatus>("all");
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

  const totalCount = projects.length;
  const inProgressCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "In Progress"
  ).length;
  const onHoldCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "On Hold (Backlogged)"
  ).length;
  const inTestingCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "In Testing"
  ).length;
  const liveCount = projects.filter(
    (p) => normalizeProjectStatus(p.status) === "Live / Deployed"
  ).length;

  const filteredProjects = projects.filter((project) => {
    const canonical = normalizeProjectStatus(project.status);
    if (statusFilter !== "all" && canonical !== statusFilter) return false;

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
    <div
      style={{
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        background: "transparent",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 12,
          flex: "0 0 auto",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "26px",
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.4px",
              lineHeight: 1.2,
            }}
          >
            Projects
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Input
            placeholder="Search projects or client..."
            prefix={<SearchOutlined style={{ color: "#6B7280", fontSize: 13, marginRight: 6 }} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{
              width: 260,
              height: 38,
              borderRadius: 8,
              border: "1px solid #E2E8F0",
              background: "#FFFFFF",
              fontSize: 13,
              color: "#111827",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
            }}
          />
          <Tooltip title="Refresh projects">
            <Button
              icon={<ReloadOutlined spin={loading} style={{ color: "#1E293B", fontSize: 13 }} />}
              onClick={fetchProjects}
              loading={loading}
              style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 8,
                border: "1px solid #E2E8F0",
                background: "#FFFFFF",
                color: "#1E293B",
                fontWeight: 500,
                fontSize: 13,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Refresh
            </Button>
          </Tooltip>
          {currentUserRole === Role.SYSTEM_ADMIN && (
            <Link href="/projects/new">
              <Button
                type="primary"
                icon={<PlusOutlined style={{ color: "#FFFFFF" }} />}
                style={{
                  height: 38,
                  padding: "0 16px",
                  background: "#009587",
                  borderColor: "#009587",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  boxShadow: "0 2px 6px rgba(0, 149, 135, 0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                New Project
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
          flex: "0 0 auto",
        }}
      >
        {[
          { key: "all", label: "All Projects", count: totalCount },
          { key: "In Progress", label: "In Progress", count: inProgressCount },
          { key: "On Hold (Backlogged)", label: "On Hold", count: onHoldCount },
          { key: "In Testing", label: "In Testing", count: inTestingCount },
          { key: "Live / Deployed", label: "Live / Deployed", count: liveCount },
        ].map((tab) => {
          const isSelected = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as any)}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 34,
                padding: "0 14px",
                borderRadius: 8,
                border: isSelected ? "1px solid #009587" : "1px solid #E2E8F0",
                background: isSelected ? "#009587" : "#FFFFFF",
                color: isSelected ? "#FFFFFF" : "#4B5563",
                fontWeight: isSelected ? 600 : 500,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: isSelected
                  ? "0 2px 8px rgba(0, 149, 135, 0.2)"
                  : "0 1px 2px rgba(0, 0, 0, 0.02)",
                transition: "all 0.15s ease",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 18,
                  height: 18,
                  padding: "0 5px",
                  borderRadius: 9,
                  fontSize: 11,
                  fontWeight: 700,
                  background: isSelected ? "#FFFFFF" : "#F1F5F9",
                  color: isSelected ? "#009587" : "#4B5563",
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Content View (Cards) ── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: 24,
        }}
      >
        {loading ? (
          <Row gutter={[22, 22]}>
            {[1, 2, 3].map((i) => (
              <Col xs={24} sm={12} lg={8} key={i}>
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid #E3E8EE",
                    background: "rgba(255, 255, 255, 0.85)",
                    padding: "24px 26px",
                  }}
                >
                  <Skeleton active paragraph={{ rows: 5 }} />
                </div>
              </Col>
            ))}
          </Row>
        ) : filteredProjects.length === 0 ? (
          <div
            style={{
              padding: "60px 0",
              textAlign: "center",
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px dashed #D9D9D9",
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 12, color: "#9CA3AF" }}>
              <ProjectOutlined />
            </div>
            <Title level={4} style={{ color: "#374151", margin: 0 }}>
              {searchQuery || statusFilter !== "all"
                ? "No matching projects found"
                : "No projects found"}
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
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      style={{ background: "#009587", borderColor: "#009587", borderRadius: 8 }}
                    >
                      New Project
                    </Button>
                  </Link>
                </div>
              )
            )}
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredProjects.map((project) => {
              const statusStyle = getProjectStatusStyle(project.status);
              const pct = project.progressPercent || 0;
              const priority = project.priority || "Medium";
              const priorityStyle = getProjectPriorityStyle(priority);

              // Calculate relative timeline
              const hasEndDate = Boolean(project.timeline?.endDate);
              const endDate = hasEndDate ? dayjs(project.timeline?.endDate) : null;
              const diffDays = endDate ? endDate.diff(dayjs(), "day") : null;
              const isOverdue = diffDays !== null && diffDays < 0;
              const daysRemainingText = !hasEndDate
                ? "No finish date"
                : isOverdue
                  ? `${Math.abs(diffDays!)}d overdue`
                  : diffDays === 0
                    ? "Due today"
                    : `${diffDays}d remaining`;
              const normalizedStatus = normalizeProjectStatus(project.status);

              return (
                <Col xs={24} sm={12} lg={8} key={project._id}>
                  <div
                    className="biometrik-project-card"
                    style={{
                      borderRadius: 14,
                      border: "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      height: "100%",
                      transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    <div>
                      {/* 1. Project Title */}
                      <div
                        style={{
                          marginBottom: 10,
                        }}
                      >
                        <Link
                          href={`/projects/${project._id}`}
                          style={{ textDecoration: "none", display: "block" }}
                        >
                          <h2
                            style={{
                              margin: 0,
                              fontSize: "18px",
                              fontWeight: 650,
                              color: "#111827",
                              lineHeight: 1.25,
                              cursor: "pointer",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={project.title || "Unnamed Project"}
                          >
                            {project.title || "Unnamed Project"}
                          </h2>
                        </Link>
                      </div>

                      {/* 2. Status & Priority Badges */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 7,
                          marginBottom: 14,
                        }}
                      >
                        {/* Status Badge */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.border}`,
                            borderRadius: 12,
                            padding: "3px 9px",
                            fontSize: 11.5,
                            fontWeight: 500,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: statusStyle.dot,
                              display: "inline-block",
                            }}
                          />
                          <span>{normalizedStatus}</span>
                        </div>

                        {/* Priority Badge */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            background: priorityStyle.bg,
                            color: priorityStyle.color,
                            border: `1px solid ${priorityStyle.border}`,
                            borderRadius: 12,
                            padding: "3px 9px",
                            fontSize: 11.5,
                            fontWeight: 500,
                          }}
                        >
                          <span
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: priorityStyle.dot,
                              display: "inline-block",
                            }}
                          />
                          <span>{priority} Priority</span>
                        </div>
                      </div>

                      {/* 3. Due Date and Remaining Days */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 12,
                          color: "#4B5563",
                          fontWeight: 500,
                          marginBottom: 16,
                          padding: "8px 10px",
                          background: "#F8FAFC",
                          borderRadius: 8,
                          border: "1px solid #F1F5F9",
                        }}
                      >
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <CalendarOutlined style={{ color: "#4B5563", fontSize: 13 }} />
                          <span>
                            {hasEndDate
                              ? `Due: ${endDate!.format("DD MMM YYYY")}`
                              : "No finish date set"}
                          </span>
                        </div>

                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <ClockCircleOutlined
                            style={{ color: isOverdue ? "#DC2626" : "#4B5563", fontSize: 13 }}
                          />
                          <span
                            style={{
                              color: isOverdue ? "#DC2626" : undefined,
                              fontWeight: isOverdue ? 600 : 500,
                            }}
                          >
                            {daysRemainingText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 5. Footer: Project Manager & Workspace CTA */}
                    <div style={{ marginTop: "auto" }}>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          fontWeight: 500,
                          marginBottom: 5,
                        }}
                      >
                        Project Manager
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <Avatar
                            size={32}
                            style={{
                              backgroundColor: "#009587",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#FFFFFF",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {(project.techOwner?.name || project.createdBy?.name || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </Avatar>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#111827",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={
                              project.techOwner?.name || project.createdBy?.name || "Unassigned"
                            }
                          >
                            {project.techOwner?.name || project.createdBy?.name || "Unassigned"}
                          </span>
                        </div>

                        <Link
                          href={`/projects/${project._id}`}
                          style={{ textDecoration: "none", flexShrink: 0 }}
                        >
                          <button
                            type="button"
                            className="biometrik-workspace-btn"
                            style={{
                              height: 34,
                              padding: "0 14px",
                              backgroundColor: "#009587",
                              border: "none",
                              borderRadius: 8,
                              color: "#FFFFFF",
                              fontSize: 13,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              cursor: "pointer",
                              boxShadow: "0 2px 6px rgba(0, 149, 135, 0.22)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <span>Workspace</span>
                            <RightOutlined style={{ fontSize: 11, color: "#FFFFFF" }} />
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      <style jsx>{`
        .biometrik-project-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 24px -4px rgba(0, 149, 135, 0.12) !important;
          border-color: #b2dfdb !important;
        }
        .biometrik-workspace-btn:hover {
          background-color: #007f73 !important;
        }
      `}</style>

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
