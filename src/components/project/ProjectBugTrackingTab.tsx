"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Modal,
  Drawer,
  Form,
  Typography,
  Avatar,
  Badge,
  Row,
  Col,
  Timeline,
  Divider,
  Radio,
  Tooltip,
  App,
  Upload,
} from "antd";
import {
  Bug,
  Plus,
  FileDown,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ShieldCheck,
  RotateCcw,
  UserCheck,
  Search,
  Filter,
  FileText,
  Paperclip,
} from "lucide-react";
import dayjs from "dayjs";
import { downloadBugPdf, downloadProjectBugsPdf } from "@/lib/bugPdfGenerator";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

export interface ProjectBugTrackingTabProps {
  projectId: string;
  project: any;
  currentUser: any;
  isProjectLead: boolean;
  teamMembers: any[];
  initialBugId?: string | null;
}

export default function ProjectBugTrackingTab({
  projectId,
  project,
  currentUser,
  isProjectLead,
  teamMembers,
  initialBugId,
}: ProjectBugTrackingTabProps) {
  const { message } = App.useApp();
  const [bugs, setBugs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  // Modals & Drawers
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [submittingBug, setSubmittingBug] = useState<boolean>(false);
  const [attachedFiles, setAttachedFiles] = useState<any[]>([]);
  const [reportForm] = Form.useForm();

  const [selectedBug, setSelectedBug] = useState<any | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);

  // Action Modals
  const [actionModalType, setActionModalType] = useState<
    "ASSIGN" | "REASSIGN" | "FIX" | "QA" | null
  >(null);
  const [actionForm] = Form.useForm();
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  // Fetch bugs for this project
  const fetchBugs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/bugs`);
      if (res.ok) {
        const json = await res.json();
        setBugs(json.data || []);
      } else {
        message.error("Failed to load bugs");
      }
    } catch (err) {
      console.error(err);
      message.error("Error loading bugs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBugs();
  }, [projectId]);

  // Deep linking: open bug detail if initialBugId is provided
  useEffect(() => {
    if (initialBugId && bugs.length > 0) {
      const match = bugs.find(
        (b) => b.bugId?.toLowerCase() === initialBugId.toLowerCase() || b._id === initialBugId
      );
      if (match) {
        setSelectedBug(match);
        setIsDetailDrawerOpen(true);
      }
    }
  }, [initialBugId, bugs]);

  // Filtered bugs
  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      if (filterSeverity !== "all" && bug.severity !== filterSeverity) return false;
      if (filterStatus !== "all" && bug.status !== filterStatus) return false;
      if (filterAssignee !== "all" && bug.assignee?._id !== filterAssignee) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = bug.bugId?.toLowerCase().includes(q);
        const matchesTitle = bug.title?.toLowerCase().includes(q);
        const matchesDesc = bug.description?.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [bugs, filterSeverity, filterStatus, filterAssignee, searchQuery]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter((b) => b.status === "OPEN").length;
    const assigned = bugs.filter((b) => b.status === "ASSIGNED").length;
    const fixed = bugs.filter((b) => b.status === "FIXED").length;
    const passed = bugs.filter((b) => b.status === "PASS").length;
    const failed = bugs.filter((b) => b.status === "FAIL").length;
    return { total, open, assigned, fixed, passed, failed };
  }, [bugs]);

  // Report Bug Form Submit
  const handleReportBug = async (values: any) => {
    try {
      const desc = (values.description || "").trim();
      if (desc.length > 350) {
        message.error(`Description length (${desc.length} chars) exceeds the 350 characters limit`);
        return;
      }
      const remarks = (values.remarks || "").trim();
      if (!remarks) {
        message.error("Zero-bypass policy: Mandatory remarks are required when reporting a bug");
        return;
      }

      setSubmittingBug(true);
      const attachmentsList: any[] = attachedFiles.map((f) => ({
        name: f.name,
        url: f.url,
        size: f.size || 0,
        mimeType: f.mimeType || "application/octet-stream",
        uploadedAt: new Date(),
      }));

      if (values.attachmentName && values.attachmentUrl) {
        attachmentsList.push({
          name: values.attachmentName.trim(),
          url: values.attachmentUrl.trim(),
          size: 0,
          mimeType: "link",
          uploadedAt: new Date(),
        });
      }

      const payload: any = {
        title: values.title.trim(),
        severity: values.severity || "Medium",
        description: desc,
        remarks,
        assignee: values.assignee || project?.techOwner?._id || undefined,
        qaAssignee: values.qaAssignee || project?.techOwner?._id || undefined,
        attachments: attachmentsList,
      };

      const res = await fetch(`/api/projects/${projectId}/bugs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        message.success(`Bug ${json.data?.bugId || ""} reported successfully!`);
        setIsReportModalOpen(false);
        setAttachedFiles([]);
        reportForm.resetFields();
        fetchBugs();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to report bug");
      }
    } catch (err: any) {
      console.error(err);
      message.error("Error creating bug report");
    } finally {
      setSubmittingBug(false);
    }
  };

  // Perform State Machine Action
  const handlePerformAction = async (values: any) => {
    if (!selectedBug) return;
    const remarks = (values.remarks || "").trim();
    if (!remarks) {
      message.error("Zero-bypass policy: Mandatory remarks are strictly required.");
      return;
    }

    try {
      setSubmittingAction(true);
      let actionType: string | null = actionModalType;
      const newAssigneeId = values.newAssigneeId;

      if (actionModalType === "QA") {
        actionType = values.qaOutcome === "PASS" ? "QA_PASS" : "QA_FAIL";
      }

      const res = await fetch(`/api/projects/${projectId}/bugs/${selectedBug._id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          remarks,
          newAssigneeId,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        message.success(json.message || "Bug updated successfully!");
        setActionModalType(null);
        actionForm.resetFields();
        setSelectedBug(json.data);
        fetchBugs();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to perform action");
      }
    } catch (err: any) {
      console.error(err);
      message.error("Error updating bug");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Helpers for Status & Severity Tags
  const renderStatusTag = (status: string, reopenCount?: number) => {
    switch (status) {
      case "PASS":
        return (
          <Tag color="success" style={{ fontWeight: 600, borderRadius: 12, padding: "1px 8px" }}>
            ● PASS (Verified)
          </Tag>
        );
      case "FAIL":
        return (
          <Space size={4}>
            <Tag color="error" style={{ fontWeight: 600, borderRadius: 12, padding: "1px 8px" }}>
              ● REOPENED
            </Tag>
            {reopenCount && reopenCount > 0 ? (
              <Tooltip title={`Reopened ${reopenCount} times`}>
                <Tag color="red" style={{ borderRadius: 10, fontSize: 10, padding: "0 5px" }}>
                  <RotateCcw size={10} style={{ display: "inline", marginRight: 2 }} />
                  {reopenCount}x
                </Tag>
              </Tooltip>
            ) : null}
          </Space>
        );
      case "FIXED":
        return (
          <Tag color="purple" style={{ fontWeight: 600, borderRadius: 12, padding: "1px 8px" }}>
            ● FIXED (Pending QA)
          </Tag>
        );
      case "ASSIGNED":
        return (
          <Tag color="processing" style={{ fontWeight: 600, borderRadius: 12, padding: "1px 8px" }}>
            ● ASSIGNED
          </Tag>
        );
      case "OPEN":
      default:
        return (
          <Tag color="warning" style={{ fontWeight: 600, borderRadius: 12, padding: "1px 8px" }}>
            ● OPEN
          </Tag>
        );
    }
  };

  const renderSeverityTag = (sev: string) => {
    switch (sev) {
      case "Severe":
        return (
          <Tag color="#b91c1c" style={{ fontWeight: 600, borderRadius: 4 }}>
            Severe
          </Tag>
        );
      case "High":
        return (
          <Tag color="#ea580c" style={{ fontWeight: 600, borderRadius: 4 }}>
            High
          </Tag>
        );
      case "Medium":
        return (
          <Tag color="#ca8a04" style={{ fontWeight: 600, borderRadius: 4 }}>
            Medium
          </Tag>
        );
      case "Low":
      default:
        return (
          <Tag color="#16a34a" style={{ fontWeight: 600, borderRadius: 4 }}>
            Low
          </Tag>
        );
    }
  };

  // Table Columns
  const columns = [
    {
      title: "Bug ID",
      dataIndex: "bugId",
      key: "bugId",
      width: 120,
      render: (id: string, record: any) => (
        <a
          onClick={() => {
            setSelectedBug(record);
            setIsDetailDrawerOpen(true);
          }}
          style={{ fontWeight: 700, color: "#00897b", fontSize: 13 }}
        >
          {id}
        </a>
      ),
    },
    {
      title: "Defect Title & Summary",
      dataIndex: "title",
      key: "title",
      render: (title: string, record: any) => (
        <div>
          <a
            onClick={() => {
              setSelectedBug(record);
              setIsDetailDrawerOpen(true);
            }}
            style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}
          >
            {title}
          </a>
          <div
            style={{
              fontSize: 12,
              color: "#64748b",
              marginTop: 2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {record.description}
          </div>
          {record.attachments && record.attachments.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <Tag icon={<Paperclip size={10} />} style={{ fontSize: 10, borderRadius: 4 }}>
                {record.attachments.length} attachment{record.attachments.length > 1 ? "s" : ""}
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (sev: string) => renderSeverityTag(sev),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 180,
      render: (status: string, record: any) => renderStatusTag(status, record.reopenCount),
    },
    {
      title: "Assignee",
      key: "assignee",
      width: 175,
      render: (_: any, record: any) => {
        const u = record.assignee;
        if (!u) {
          return (
            <Tag color="warning" style={{ borderRadius: 12, fontWeight: 600, padding: "2px 8px" }}>
              ● To be assigned
            </Tag>
          );
        }
        return (
          <Space size={6} align="start">
            <Avatar
              size={22}
              style={{ backgroundColor: "#0284c7", fontSize: 10, fontWeight: 600, marginTop: 2 }}
            >
              {u.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{u.name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {record.assignedAt
                  ? `Assigned: ${dayjs(record.assignedAt).format("DD MMM YYYY")}`
                  : "Assigned"}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: "Reported",
      key: "reported",
      width: 150,
      render: (_: any, record: any) => (
        <div style={{ fontSize: 11, color: "#64748b" }}>
          <div>
            By: <strong style={{ color: "#334155" }}>{record.reportedBy?.name || "User"}</strong>
          </div>
          <div>{dayjs(record.reportedAt).format("DD MMM YYYY")}</div>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="View Investigation Dossier">
            <Button
              size="small"
              type="text"
              icon={<Eye size={14} color="#00897b" />}
              onClick={() => {
                setSelectedBug(record);
                setIsDetailDrawerOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Download Dossier PDF">
            <Button
              size="small"
              type="text"
              icon={<FileDown size={14} color="#0284c7" />}
              onClick={() => downloadBugPdf(record, project?.title)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Role permissions for current user
  const currentUserId = currentUser?._id || currentUser?.id;
  const isAssignedDev = selectedBug && selectedBug.assignee?._id?.toString() === currentUserId;
  const isDesignatedQA =
    (selectedBug && selectedBug.qaAssignee?._id?.toString() === currentUserId) ||
    (project?.qaLead && String(project.qaLead?._id || project.qaLead) === String(currentUserId));
  const isQAUser =
    isDesignatedQA ||
    currentUser?.role === "QA" ||
    currentUser?.role === "TESTER" ||
    currentUser?.role === "SYSTEM_ADMIN" ||
    currentUser?.role === "ADMIN" ||
    isProjectLead;

  return (
    <div style={{ padding: "8px 0" }}>
      {/* ── Top KPI Cards ──────────────────────────────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#64748b",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Total Defects
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
              {kpis.total}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: "1px solid #fef3c7",
              background: "#fffbeb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#b45309",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Open
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#d97706", marginTop: 2 }}>
              {kpis.open}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: "1px solid #e0f2fe",
              background: "#f0f9ff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#0369a1",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Assigned
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#0284c7", marginTop: 2 }}>
              {kpis.assigned}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: "1px solid #f3e8ff",
              background: "#faf5ff",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#7e22ce",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Fixed (QA Queue)
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#9333ea", marginTop: 2 }}>
              {kpis.fixed}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: "1px solid #dcfce7",
              background: "#f0fdf4",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#15803d",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              QA Passed
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#16a34a", marginTop: 2 }}>
              {kpis.passed}
            </div>
          </Card>
        </Col>

        <Col xs={12} sm={8} md={4}>
          <Card
            size="small"
            style={{
              borderRadius: 8,
              border: "1px solid #fee2e2",
              background: "#fef2f2",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "#b91c1c",
                fontWeight: 600,
                textTransform: "uppercase",
              }}
            >
              Reopened
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#dc2626", marginTop: 2 }}>
              {kpis.failed}
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Toolbar: Filters & Actions ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          padding: "10px 14px",
          background: "#f8fafc",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
        }}
      >
        <Space size={10} wrap style={{ flex: 1, minWidth: 280 }}>
          <Input
            placeholder="Search bug ID, title, or description..."
            prefix={<Search size={14} color="#94a3b8" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            style={{ width: 260, borderRadius: 6 }}
          />

          <Select
            value={filterSeverity}
            onChange={setFilterSeverity}
            style={{ width: 130 }}
            options={[
              { label: "All Severities", value: "all" },
              { label: "Severe", value: "Severe" },
              { label: "High", value: "High" },
              { label: "Medium", value: "Medium" },
              { label: "Low", value: "Low" },
            ]}
          />

          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 140 }}
            options={[
              { label: "All Statuses", value: "all" },
              { label: "OPEN", value: "OPEN" },
              { label: "ASSIGNED", value: "ASSIGNED" },
              { label: "FIXED", value: "FIXED" },
              { label: "PASS", value: "PASS" },
              { label: "REOPENED", value: "FAIL" },
            ]}
          />

          <Select
            value={filterAssignee}
            onChange={setFilterAssignee}
            style={{ width: 170 }}
            options={[
              { label: "All Assignees", value: "all" },
              ...teamMembers.map((m) => ({
                label: m.name,
                value: m._id,
              })),
            ]}
          />
        </Space>

        <Space size={10}>
          <Button
            icon={<FileDown size={14} />}
            onClick={() => downloadProjectBugsPdf(project?.title, filteredBugs)}
            disabled={bugs.length === 0}
          >
            Export Bug Report PDF
          </Button>

          <Button
            type="primary"
            icon={<Plus size={14} />}
            onClick={() => {
              reportForm.resetFields();
              // Defaults
              reportForm.setFieldsValue({
                severity: "Medium",
                assignee: project?.techOwner?._id,
                qaAssignee: project?.qaLead?._id || project?.techOwner?._id,
              });
              setIsReportModalOpen(true);
            }}
            style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
          >
            Report New Bug
          </Button>
        </Space>
      </div>

      {/* ── Bug List Table ────────────────────────────────────────────────────── */}
      <Table
        dataSource={filteredBugs}
        columns={columns}
        rowKey="_id"
        loading={loading}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: "No bugs recorded for this project." }}
      />

      {/* ── Report Bug Modal (BRD Section 3 & Section 6) ────────────────────── */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bug size={16} color="#dc2626" />
            </div>
            <span>Report New Bug</span>
          </div>
        }
        open={isReportModalOpen}
        onCancel={() => {
          setIsReportModalOpen(false);
          setAttachedFiles([]);
        }}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form
          form={reportForm}
          layout="vertical"
          onFinish={handleReportBug}
          initialValues={{
            severity: "Medium",
            assignee: project?.techOwner?._id,
            qaAssignee: project?.qaLead?._id || project?.techOwner?._id,
          }}
          style={{ marginTop: 16 }}
        >
          {/* 1. Title (Mandatory) */}
          <Form.Item
            name="title"
            label={<strong>Title</strong>}
            rules={[{ required: true, message: "Title is mandatory" }]}
          >
            <Input placeholder="Short title describing the bug" />
          </Form.Item>

          {/* 2. Severity (Mandatory dropdown) */}
          <Form.Item
            name="severity"
            label={<strong>Severity</strong>}
            rules={[{ required: true, message: "Severity is mandatory" }]}
          >
            <Select
              placeholder="Select Severity"
              options={[
                { label: "Severe (Crash / Blocker)", value: "Severe" },
                { label: "High (Major Defect)", value: "High" },
                { label: "Medium (Normal Defect)", value: "Medium" },
                { label: "Low (Cosmetic / Trivial)", value: "Low" },
              ]}
            />
          </Form.Item>

          {/* 3. Description (Mandatory text area, ~350 chars limit) */}
          <Form.Item
            name="description"
            label={
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <strong>Description</strong>
                <span style={{ fontSize: 11, color: "#64748b" }}>Limit: ~350 characters</span>
              </div>
            }
            rules={[
              { required: true, message: "Description is mandatory" },
              {
                max: 350,
                message: "Description limit of approximately 350 characters exceeded",
              },
            ]}
          >
            <TextArea
              rows={3}
              maxLength={350}
              showCount
              placeholder="Explain the bug (steps to reproduce, observed vs expected behavior)..."
            />
          </Form.Item>

          {/* 4. Attachment (Optional file attachment) */}
          <Form.Item
            label={
              <span>
                <strong>Attachment</strong>{" "}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Optional)
                </Text>
              </span>
            }
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Upload
                multiple
                beforeUpload={(file) => {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    setAttachedFiles((prev) => [
                      ...prev,
                      {
                        name: file.name,
                        url: e.target?.result as string,
                        size: file.size,
                        mimeType: file.type || "application/octet-stream",
                        uid: file.uid,
                      },
                    ]);
                  };
                  reader.readAsDataURL(file);
                  return false;
                }}
                onRemove={(file) => {
                  setAttachedFiles((prev) => prev.filter((f) => f.uid !== file.uid));
                }}
                fileList={attachedFiles.map((f) => ({
                  uid: f.uid,
                  name: f.name,
                  status: "done",
                }))}
              >
                <Button icon={<Paperclip size={14} />}>Attach File / Screenshot</Button>
              </Upload>

              <div style={{ fontSize: 11, color: "#64748b" }}>Or attach external link:</div>
              <Row gutter={8}>
                <Col xs={24} sm={10}>
                  <Form.Item name="attachmentName" noStyle>
                    <Input placeholder="Attachment Name (e.g. error.png)" size="small" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={14}>
                  <Form.Item name="attachmentUrl" noStyle>
                    <Input placeholder="URL / Storage Link" size="small" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </Form.Item>

          {/* 5. Reported By (Automatically populated, read-only) */}
          <Form.Item label={<strong>Reported By</strong>}>
            <Input
              value={`${currentUser?.name || "Logged-in User"} (${currentUser?.role || "Member"})`}
              disabled
              readOnly
              style={{ backgroundColor: "#f8fafc", color: "#334155", fontWeight: 500 }}
            />
          </Form.Item>

          {/* 6. Assignee (Default to Project Manager, developers can self-assign) */}
          <Form.Item
            name="assignee"
            label={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  alignItems: "center",
                }}
              >
                <strong>Assignee</strong>
                {currentUser?._id && (
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: "auto", fontSize: 12 }}
                    onClick={() => {
                      reportForm.setFieldsValue({
                        assignee: currentUser?._id || currentUser?.id,
                      });
                    }}
                  >
                    Self-assign to me
                  </Button>
                )}
              </div>
            }
            tooltip="By default, assigned to the Project Manager responsible for the project. The developer team can also self-assign bugs to themselves."
          >
            <Select
              placeholder="Defaults to Project Manager"
              options={[
                ...(project?.techOwner
                  ? [
                      {
                        label: `${project.techOwner.name} (Project Manager)`,
                        value: project.techOwner._id,
                      },
                    ]
                  : []),
                ...(isProjectLead
                  ? teamMembers
                      .filter((m) => String(m._id) !== String(project?.techOwner?._id))
                      .map((m) => {
                        const isMe = String(m._id) === String(currentUser?._id || currentUser?.id);
                        return {
                          label: `${m.name} (${m.role || "Developer"})${isMe ? " — [Me]" : ""}`,
                          value: m._id,
                        };
                      })
                  : currentUser?._id && String(currentUser._id) !== String(project?.techOwner?._id)
                    ? [
                        {
                          label: `${currentUser.name} (${currentUser.role || "Developer"}) — [Me]`,
                          value: currentUser._id,
                        },
                      ]
                    : []),
              ]}
            />
          </Form.Item>

          {/* 7. Designated QA Tester (Project Manager by default or selected QA) */}
          <Form.Item
            name="qaAssignee"
            label={<strong>Designated QA Tester</strong>}
            tooltip="By default, assigned to the Project Manager who has full QA verification authority, or you may choose another team tester."
          >
            <Select
              placeholder="Defaults to QA Lead / Project Manager"
              options={[
                ...(project?.qaLead
                  ? [
                      {
                        label: `${project.qaLead.name} (Designated QA Lead)`,
                        value: project.qaLead._id,
                      },
                    ]
                  : []),
                ...(project?.techOwner &&
                String(project?.techOwner?._id) !== String(project?.qaLead?._id)
                  ? [
                      {
                        label: `${project.techOwner.name} (Project Manager & QA)`,
                        value: project.techOwner._id,
                      },
                    ]
                  : []),
                ...teamMembers
                  .filter(
                    (m) =>
                      String(m._id) !== String(project?.qaLead?._id) &&
                      String(m._id) !== String(project?.techOwner?._id)
                  )
                  .map((m) => ({
                    label: `${m.name} (${m.role || "Tester"})`,
                    value: m._id,
                  })),
              ]}
            />
          </Form.Item>

          {/* 7. Mandatory Remarks (Section 6) */}
          <Form.Item
            name="remarks"
            label={<strong>Remarks (Mandatory — Zero-Bypass Policy)</strong>}
            tooltip="Remarks are strictly required for reporting a new bug."
            rules={[{ required: true, message: "Remarks are mandatory when reporting a bug" }]}
          >
            <TextArea
              rows={2}
              placeholder="Enter mandatory remarks (context, environment, or initial assessment)..."
            />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <Button
              onClick={() => {
                setIsReportModalOpen(false);
                setAttachedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingBug}
              style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
            >
              Submit Bug Report
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Bug Investigation Detail & Audit Drawer ─────────────────────────── */}
      <Drawer
        title={
          selectedBug ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#00897b", fontWeight: 700 }}>{selectedBug.bugId}</span>
              {renderStatusTag(selectedBug.status, selectedBug.reopenCount)}
              {renderSeverityTag(selectedBug.severity)}
            </div>
          ) : (
            "Bug Details"
          )
        }
        open={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        width={680}
        extra={
          selectedBug && (
            <Button
              size="small"
              icon={<FileDown size={14} />}
              onClick={() => downloadBugPdf(selectedBug, project?.title)}
            >
              Export PDF
            </Button>
          )
        }
      >
        {selectedBug && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* Title */}
            <div>
              <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                {selectedBug.title}
              </Title>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                Reported on {dayjs(selectedBug.reportedAt).format("DD MMM YYYY, hh:mm A")} by{" "}
                <strong>{selectedBug.reportedBy?.name || "System"}</strong>
              </div>
            </div>

            {/* ── Quick Action Transition Bar ───────────────────────────────── */}
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: "#f8fafc",
                borderColor: "#cbd5e1",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#475569",
                      textTransform: "uppercase",
                    }}
                  >
                    Current State
                  </div>
                  <div style={{ marginTop: 2 }}>
                    {renderStatusTag(selectedBug.status, selectedBug.reopenCount)}
                  </div>
                </div>

                <Space size={8} wrap>
                  {/* OPEN -> ASSIGN / SELF-ASSIGN */}
                  {selectedBug.status === "OPEN" && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<UserCheck size={14} />}
                      onClick={() => {
                        actionForm.resetFields();
                        if (!isProjectLead && currentUserId) {
                          actionForm.setFieldsValue({ newAssigneeId: currentUserId });
                        }
                        setActionModalType("ASSIGN");
                      }}
                      style={{ backgroundColor: "#0284c7", borderColor: "#0284c7" }}
                    >
                      {isProjectLead ? "Assign Developer" : "Self-Assign Bug"}
                    </Button>
                  )}

                  {/* ASSIGNED -> REASSIGN */}
                  {selectedBug.status === "ASSIGNED" && isProjectLead && (
                    <Button
                      size="small"
                      icon={<RotateCcw size={14} />}
                      onClick={() => {
                        actionForm.resetFields();
                        setActionModalType("REASSIGN");
                      }}
                    >
                      Reassign
                    </Button>
                  )}

                  {/* ASSIGNED or FAIL -> FIX */}
                  {(selectedBug.status === "ASSIGNED" || selectedBug.status === "FAIL") &&
                    (isAssignedDev || isProjectLead) && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckCircle2 size={14} />}
                        onClick={() => {
                          actionForm.resetFields();
                          setActionModalType("FIX");
                        }}
                        style={{ backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}
                      >
                        Submit Fix
                      </Button>
                    )}

                  {/* FIXED -> QA VERIFICATION */}
                  {selectedBug.status === "FIXED" && isQAUser && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<ShieldCheck size={14} />}
                      onClick={() => {
                        actionForm.resetFields();
                        setActionModalType("QA");
                      }}
                      style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
                    >
                      QA Verification (Sign-off)
                    </Button>
                  )}
                </Space>
              </div>
            </Card>

            {/* ── Metadata Grid ─────────────────────────────────────────────── */}
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 10,
                    background: "#f8fafc",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}
                  >
                    Current Assignee
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    {selectedBug.assignee ? (
                      <>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                          {selectedBug.assignee.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Assigned:{" "}
                          {selectedBug.assignedAt
                            ? dayjs(selectedBug.assignedAt).format("DD MMM YYYY")
                            : "Recorded"}
                        </div>
                      </>
                    ) : (
                      <Tag color="warning" style={{ borderRadius: 12, fontWeight: 600 }}>
                        ● To be assigned
                      </Tag>
                    )}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 10,
                    background: "#f8fafc",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}
                  >
                    Designated QA
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#00897b" }}>
                      {selectedBug.qaAssignee?.name ||
                        project?.techOwner?.name ||
                        "Project Manager (QA)"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Authority: <strong>PM & Tester</strong>
                    </div>
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 10,
                    background: "#f8fafc",
                    borderRadius: 6,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Text
                    type="secondary"
                    style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}
                  >
                    Cycle Statistics
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                      Reopened: {selectedBug.reopenCount ?? 0} time
                      {selectedBug.reopenCount === 1 ? "" : "s"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      QA Outcome: <strong>{selectedBug.qaOutcome || selectedBug.status}</strong>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* ── Problem Description ───────────────────────────────────────── */}
            <div>
              <Text strong style={{ fontSize: 12, textTransform: "uppercase", color: "#475569" }}>
                Problem Description (~350 Chars)
              </Text>
              <div
                style={{
                  marginTop: 6,
                  padding: 12,
                  background: "#ffffff",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedBug.description}
              </div>
            </div>

            {/* ── Reporter Remarks ──────────────────────────────────────────── */}
            {selectedBug.latestReporterRemarks && (
              <div>
                <Text strong style={{ fontSize: 12, textTransform: "uppercase", color: "#475569" }}>
                  Reporter Discovery Remarks
                </Text>
                <div
                  style={{
                    marginTop: 6,
                    padding: 10,
                    background: "#f1f5f9",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12,
                    color: "#334155",
                  }}
                >
                  {selectedBug.latestReporterRemarks}
                </div>
              </div>
            )}

            {/* ── Developer Fix Remarks ──────────────────────────────────────── */}
            {selectedBug.latestDeveloperRemarks && (
              <div>
                <Text strong style={{ fontSize: 12, textTransform: "uppercase", color: "#6b21a8" }}>
                  Developer Resolution Remarks
                </Text>
                <div
                  style={{
                    marginTop: 6,
                    padding: 10,
                    background: "#faf5ff",
                    borderRadius: 6,
                    border: "1px solid #d8b4fe",
                    fontSize: 12,
                    color: "#581c87",
                  }}
                >
                  {selectedBug.latestDeveloperRemarks}
                </div>
              </div>
            )}

            {/* ── QA Test Remarks ───────────────────────────────────────────── */}
            {selectedBug.latestQARemarks && (
              <div>
                <Text
                  strong
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    color: selectedBug.status === "PASS" ? "#166534" : "#991b1b",
                  }}
                >
                  QA Verification Remarks ({selectedBug.qaOutcome || selectedBug.status})
                </Text>
                <div
                  style={{
                    marginTop: 6,
                    padding: 10,
                    background: selectedBug.status === "PASS" ? "#f0fdf4" : "#fef2f2",
                    borderRadius: 6,
                    border:
                      selectedBug.status === "PASS" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                    fontSize: 12,
                    color: selectedBug.status === "PASS" ? "#14532d" : "#7f1d1d",
                  }}
                >
                  {selectedBug.latestQARemarks}
                </div>
              </div>
            )}

            {/* ── Attachments ────────────────────────────────────────────────── */}
            {selectedBug.attachments && selectedBug.attachments.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 12, textTransform: "uppercase", color: "#475569" }}>
                  Attachments ({selectedBug.attachments.length})
                </Text>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedBug.attachments.map((att: any, idx: number) => (
                    <Tag
                      key={idx}
                      icon={<Paperclip size={12} />}
                      style={{ padding: "4px 8px", borderRadius: 4 }}
                    >
                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                        {att.name || "Attachment"}
                      </a>
                    </Tag>
                  ))}
                </div>
              </div>
            )}

            <Divider style={{ margin: "10px 0" }} />

            {/* ── Chronological Immutable Audit Trail ───────────────────────── */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text strong style={{ fontSize: 13, textTransform: "uppercase", color: "#0f172a" }}>
                  Audit Trail & History
                </Text>
                <span style={{ fontSize: 11, color: "#64748b" }}>Zero-Bypass Policy Enforced</span>
              </div>

              {selectedBug.auditTrail && selectedBug.auditTrail.length > 0 ? (
                <Timeline
                  items={selectedBug.auditTrail.map((entry: any, i: number) => {
                    const isQaPass = entry.action === "QA_PASS";
                    const isQaFail = entry.action === "QA_FAIL";
                    const isFix = entry.action === "FIXED";
                    const isAssign = entry.action === "ASSIGNED" || entry.action === "REASSIGNED";

                    return {
                      key: i,
                      color: isQaPass
                        ? "green"
                        : isQaFail
                          ? "red"
                          : isFix
                            ? "purple"
                            : isAssign
                              ? "blue"
                              : "gray",
                      children: (
                        <div style={{ paddingBottom: 6 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}
                          >
                            <Tag
                              color={
                                isQaPass
                                  ? "success"
                                  : isQaFail
                                    ? "error"
                                    : isFix
                                      ? "purple"
                                      : isAssign
                                        ? "blue"
                                        : "default"
                              }
                              style={{ borderRadius: 10, fontSize: 10, fontWeight: 700 }}
                            >
                              {entry.action}
                            </Tag>

                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              {dayjs(entry.timestamp).format("DD MMM YYYY, hh:mm A")}
                            </span>

                            <span style={{ fontSize: 11, color: "#334155" }}>
                              by <strong>{entry.performedBy?.name || "User"}</strong>
                            </span>
                          </div>

                          {entry.newStatus && entry.previousStatus && (
                            <div style={{ fontSize: 11, color: "#0284c7", marginTop: 2 }}>
                              Status: {entry.previousStatus} → <strong>{entry.newStatus}</strong>
                            </div>
                          )}

                          {entry.newAssignee && (
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                              Assignee:{" "}
                              {entry.previousAssignee?.name
                                ? `${entry.previousAssignee.name} → `
                                : ""}
                              <strong>{entry.newAssignee?.name || "Assigned Developer"}</strong>
                            </div>
                          )}

                          <div
                            style={{
                              marginTop: 4,
                              padding: "6px 10px",
                              backgroundColor: "#f8fafc",
                              borderRadius: 4,
                              border: "1px solid #e2e8f0",
                              fontSize: 12,
                              color: "#334155",
                            }}
                          >
                            <span style={{ fontWeight: 600, color: "#475569" }}>Remarks: </span>
                            {entry.remarks}
                          </div>
                        </div>
                      ),
                    };
                  })}
                />
              ) : (
                <Text type="secondary" italic>
                  No audit entries recorded.
                </Text>
              )}
            </div>
          </Space>
        )}
      </Drawer>

      {/* ── Transition Action Modal ──────────────────────────────────────────── */}
      <Modal
        title={
          actionModalType === "ASSIGN"
            ? "Assign Defect to Developer"
            : actionModalType === "REASSIGN"
              ? "Reassign Defect to New Developer"
              : actionModalType === "FIX"
                ? "Submit Defect Fix (Awaiting QA)"
                : "QA Defect Verification & Sign-off"
        }
        open={actionModalType !== null}
        onCancel={() => setActionModalType(null)}
        footer={null}
        destroyOnClose
      >
        <Form
          form={actionForm}
          layout="vertical"
          onFinish={handlePerformAction}
          style={{ marginTop: 12 }}
        >
          {/* ASSIGN or REASSIGN: select developer */}
          {(actionModalType === "ASSIGN" || actionModalType === "REASSIGN") && (
            <Form.Item
              name="newAssigneeId"
              label={isProjectLead ? "Select Developer" : "Self-Assign to Myself"}
              rules={[{ required: true, message: "Please select a developer" }]}
            >
              <Select
                placeholder="Choose developer"
                options={
                  isProjectLead
                    ? teamMembers.map((m) => ({
                        label: `${m.name} (${m.role || "Developer"})`,
                        value: m._id,
                      }))
                    : teamMembers
                        .filter((m) => String(m._id) === String(currentUserId))
                        .map((m) => ({
                          label: `${m.name} (Myself)`,
                          value: m._id,
                        }))
                }
              />
            </Form.Item>
          )}

          {/* QA Verification: Outcome Radio */}
          {actionModalType === "QA" && (
            <Form.Item
              name="qaOutcome"
              label="Verification Outcome"
              initialValue="PASS"
              rules={[{ required: true, message: "Please select test outcome" }]}
            >
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="PASS" style={{ color: "#16a34a" }}>
                  <CheckCircle2 size={14} style={{ display: "inline", marginRight: 4 }} />
                  PASS (Mark Complete)
                </Radio.Button>
                <Radio.Button value="FAIL" style={{ color: "#dc2626" }}>
                  <XCircle size={14} style={{ display: "inline", marginRight: 4 }} />
                  REOPEN (Auto-Return to Dev)
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {/* Mandatory Remarks for EVERY action */}
          <Form.Item
            name="remarks"
            label="Mandatory Remarks (Zero-Bypass Policy)"
            tooltip={
              actionModalType === "FIX"
                ? "Explain resolution, modified files, and unit test results"
                : actionModalType === "QA"
                  ? "Describe test environment, build number, test cases executed or failure evidence"
                  : "State reason for assignment/reassignment"
            }
            rules={[{ required: true, message: "Remarks are strictly mandatory" }]}
          >
            <TextArea
              rows={3}
              placeholder={
                actionModalType === "FIX"
                  ? "Describe fix details, code changes, and verification performed..."
                  : actionModalType === "QA"
                    ? "Specify test environment, test steps, pass evidence or defect persistence..."
                    : "State rationale for assignment..."
              }
            />
          </Form.Item>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <Button onClick={() => setActionModalType(null)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingAction}
              style={{
                backgroundColor:
                  actionModalType === "FIX"
                    ? "#7c3aed"
                    : actionModalType === "QA"
                      ? "#00897b"
                      : "#0284c7",
                borderColor:
                  actionModalType === "FIX"
                    ? "#7c3aed"
                    : actionModalType === "QA"
                      ? "#00897b"
                      : "#0284c7",
              }}
            >
              Submit Transition
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
