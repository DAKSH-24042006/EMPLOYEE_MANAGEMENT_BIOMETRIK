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
  Drawer,
  Modal,
  Typography,
  Avatar,
  Row,
  Col,
  Timeline,
  Divider,
  DatePicker,
  Tooltip,
  App,
} from "antd";
import {
  Bug,
  FileDown,
  Eye,
  Search,
  Filter,
  Paperclip,
  RotateCcw,
  Shield,
  Layers,
} from "lucide-react";
import dayjs from "dayjs";
import { downloadBugPdf, downloadProjectBugsPdf } from "@/lib/bugPdfGenerator";

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

export default function BugHistoryPage() {
  const { message } = App.useApp();
  const [bugs, setBugs] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterReportedBy, setFilterReportedBy] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterQAOutcome, setFilterQAOutcome] = useState<string>("all");
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // Selected Bug & Drawer
  const [selectedBug, setSelectedBug] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Fetch bugs and projects
  const fetchData = async () => {
    try {
      setLoading(true);
      const [bugsRes, projectsRes] = await Promise.all([
        fetch("/api/bugs/history"),
        fetch("/api/projects"),
      ]);

      if (bugsRes.ok) {
        const bJson = await bugsRes.json();
        setBugs(bJson.data || []);
      }
      if (projectsRes.ok) {
        const pJson = await projectsRes.json();
        setProjects(pJson.data || []);
      }
    } catch (err) {
      console.error(err);
      message.error("Failed to load bug history data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Distinct Reporters & Assignees for filter dropdowns
  const distinctReporters = useMemo(() => {
    const map = new Map<string, string>();
    bugs.forEach((b) => {
      if (b.reportedBy?._id && b.reportedBy?.name) {
        map.set(String(b.reportedBy._id), b.reportedBy.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ label: name, value: id }));
  }, [bugs]);

  const distinctAssignees = useMemo(() => {
    const map = new Map<string, string>();
    bugs.forEach((b) => {
      if (b.assignee?._id && b.assignee?.name) {
        map.set(String(b.assignee._id), b.assignee.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ label: name, value: id }));
  }, [bugs]);

  // Filtered bugs
  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      if (filterProject !== "all" && bug.projectId?._id !== filterProject) return false;
      if (filterSeverity !== "all" && bug.severity !== filterSeverity) return false;
      if (filterStatus !== "all" && bug.status !== filterStatus) return false;
      if (filterReportedBy !== "all" && String(bug.reportedBy?._id) !== filterReportedBy)
        return false;
      if (filterAssignee !== "all" && String(bug.assignee?._id) !== filterAssignee) return false;
      if (filterQAOutcome !== "all") {
        if (filterQAOutcome === "NONE" && bug.qaOutcome) return false;
        if (filterQAOutcome !== "NONE" && bug.qaOutcome !== filterQAOutcome) return false;
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        const rep = dayjs(bug.reportedAt);
        if (rep.isBefore(dateRange[0], "day") || rep.isAfter(dateRange[1], "day")) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = bug.bugId?.toLowerCase().includes(q);
        const matchesTitle = bug.title?.toLowerCase().includes(q);
        const matchesDesc = bug.description?.toLowerCase().includes(q);
        const matchesProj = bug.projectId?.title?.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesDesc && !matchesProj) return false;
      }
      return true;
    });
  }, [
    bugs,
    filterProject,
    filterSeverity,
    filterStatus,
    filterReportedBy,
    filterAssignee,
    filterQAOutcome,
    dateRange,
    searchQuery,
  ]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = bugs.length;
    const open = bugs.filter((b) => b.status === "OPEN").length;
    const assigned = bugs.filter((b) => b.status === "ASSIGNED").length;
    const fixed = bugs.filter((b) => b.status === "FIXED").length;
    const passed = bugs.filter((b) => b.status === "PASS").length;
    const failed = bugs.filter((b) => b.status === "FAIL").length;
    return { total, open, assigned, fixed, passed, failed };
  }, [bugs]);

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
              <Tag color="red" style={{ borderRadius: 10, fontSize: 10 }}>
                {reopenCount}x
              </Tag>
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

  const columns = [
    {
      title: "Bug ID",
      dataIndex: "bugId",
      key: "bugId",
      width: 120,
      sorter: (a: any, b: any) => (a.bugId || "").localeCompare(b.bugId || ""),
      render: (id: string, record: any) => (
        <a
          onClick={() => {
            setSelectedBug(record);
            setIsDrawerOpen(true);
          }}
          style={{ fontWeight: 700, color: "#00897b", fontSize: 13 }}
        >
          {id}
        </a>
      ),
    },
    {
      title: "Project",
      key: "project",
      width: 160,
      sorter: (a: any, b: any) =>
        (a.projectId?.title || "").localeCompare(b.projectId?.title || ""),
      render: (_: any, record: any) => (
        <span style={{ fontWeight: 600, color: "#334155" }}>
          {record.projectId?.title || "Project Workspace"}
        </span>
      ),
    },
    {
      title: "Bug Title",
      dataIndex: "title",
      key: "title",
      sorter: (a: any, b: any) => (a.title || "").localeCompare(b.title || ""),
      render: (title: string, record: any) => (
        <div>
          <a
            onClick={() => {
              setSelectedBug(record);
              setIsDrawerOpen(true);
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
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {record.description}
          </div>
        </div>
      ),
    },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      sorter: (a: any, b: any) => {
        const order: Record<string, number> = { Severe: 4, High: 3, Medium: 2, Low: 1 };
        return (order[a.severity] || 0) - (order[b.severity] || 0);
      },
      render: (sev: string) => renderSeverityTag(sev),
    },
    {
      title: "Date Assigned",
      key: "assignedDate",
      width: 130,
      sorter: (a: any, b: any) =>
        (a.assignedAt ? new Date(a.assignedAt).getTime() : 0) -
        (b.assignedAt ? new Date(b.assignedAt).getTime() : 0),
      render: (_: any, record: any) => (
        <span style={{ fontSize: 12, color: record.assignedAt ? "#334155" : "#94a3b8" }}>
          {record.assignedAt ? dayjs(record.assignedAt).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 160,
      sorter: (a: any, b: any) => (a.status || "").localeCompare(b.status || ""),
      render: (status: string, record: any) => renderStatusTag(status, record.reopenCount),
    },
    {
      title: "Assignee",
      key: "assignee",
      width: 160,
      sorter: (a: any, b: any) => (a.assignee?.name || "").localeCompare(b.assignee?.name || ""),
      render: (_: any, record: any) => {
        const u = record.assignee;
        if (!u) {
          return (
            <Tag color="warning" style={{ borderRadius: 12, fontWeight: 600, padding: "2px 8px" }}>
              ● Unassigned
            </Tag>
          );
        }
        return (
          <Space size={6} align="center">
            <Avatar size={22} style={{ backgroundColor: "#0284c7", fontSize: 10, fontWeight: 600 }}>
              {u.name?.charAt(0).toUpperCase()}
            </Avatar>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#334155" }}>{u.name}</span>
          </Space>
        );
      },
    },
    {
      title: "Date Reported",
      dataIndex: "reportedAt",
      key: "reportedAt",
      width: 130,
      sorter: (a: any, b: any) =>
        (a.reportedAt ? new Date(a.reportedAt).getTime() : 0) -
        (b.reportedAt ? new Date(b.reportedAt).getTime() : 0),
      render: (d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "—"),
    },
    {
      title: "Last Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 130,
      sorter: (a: any, b: any) =>
        (a.updatedAt ? new Date(a.updatedAt).getTime() : 0) -
        (b.updatedAt ? new Date(b.updatedAt).getTime() : 0),
      render: (d: string) => (d ? dayjs(d).format("DD MMM YYYY") : "—"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 80,
      render: (_: any, record: any) => (
        <Space size={4}>
          <Tooltip title="View Investigation">
            <Button
              size="small"
              type="text"
              icon={<Eye size={14} color="#009587" />}
              onClick={() => {
                setSelectedBug(record);
                setIsDrawerOpen(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Export Bug Report">
            <Button
              size="small"
              type="text"
              icon={<FileDown size={14} color="#0284c7" />}
              onClick={() => downloadBugPdf(record, record.projectId?.title)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "20px 24px", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: "#e0f2f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bug size={20} color="#00897b" />
          </div>
          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                color: "#00897b",
                fontWeight: 800,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              TRUTIK
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Centralized, read-only audit repository of all reported project defects across the
              organization.
            </Text>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 18 }}>
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
              Fixed (Pending QA)
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

      {/* ── Filter Bar & Consolidated Export ─────────────────────────────────── */}
      <Card
        size="small"
        style={{
          borderRadius: 10,
          marginBottom: 16,
          border: "1px solid #e2e8f0",
          backgroundColor: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Space size={10} wrap style={{ flex: 1 }}>
            <Input
              placeholder="Search across all defects..."
              prefix={<Search size={14} color="#94a3b8" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ width: 220, borderRadius: 6 }}
            />

            <Select
              value={filterProject}
              onChange={setFilterProject}
              style={{ width: 180 }}
              options={[
                { label: "All Projects", value: "all" },
                ...projects.map((p) => ({ label: p.title, value: p._id })),
              ]}
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
              value={filterReportedBy}
              onChange={setFilterReportedBy}
              style={{ width: 150 }}
              options={[{ label: "All Reporters", value: "all" }, ...distinctReporters]}
            />

            <Select
              value={filterAssignee}
              onChange={setFilterAssignee}
              style={{ width: 150 }}
              options={[{ label: "All Assignees", value: "all" }, ...distinctAssignees]}
            />

            <Select
              value={filterQAOutcome}
              onChange={setFilterQAOutcome}
              style={{ width: 140 }}
              options={[
                { label: "All QA Outcomes", value: "all" },
                { label: "PASS", value: "PASS" },
                { label: "FAIL", value: "FAIL" },
                { label: "Pending QA", value: "NONE" },
              ]}
            />

            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as any)}
              style={{ width: 230 }}
            />
          </Space>

          <Button
            icon={<FileDown size={14} />}
            onClick={() => downloadProjectBugsPdf("Consolidated_System_Wide", filteredBugs)}
            disabled={filteredBugs.length === 0}
          >
            Export Consolidated PDF
          </Button>
        </div>
      </Card>

      {/* ── Read-Only Table ─────────────────────────────────────────────────── */}
      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
        }}
      >
        <Table
          dataSource={filteredBugs}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={{ defaultPageSize: 15, showSizeChanger: true }}
          locale={{ emptyText: "No bug history records match your filters." }}
        />
      </Card>

      {/* ── Investigation Details Centered Modal Sheet ───────────────────────────── */}
      <Modal
        title={
          selectedBug ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingRight: 32,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#009587", fontWeight: 700, fontSize: 16 }}>
                  {selectedBug.bugId}
                </span>
                {renderStatusTag(selectedBug.status, selectedBug.reopenCount)}
                {renderSeverityTag(selectedBug.severity)}
              </div>
              <Button
                size="small"
                icon={<FileDown size={14} />}
                onClick={() => downloadBugPdf(selectedBug, selectedBug.projectId?.title)}
                style={{ borderColor: "#009587", color: "#009587" }}
              >
                Export PDF
              </Button>
            </div>
          ) : (
            "Investigation Details"
          )
        }
        open={isDrawerOpen}
        onCancel={() => setIsDrawerOpen(false)}
        footer={null}
        width="94%"
        centered
        destroyOnClose
        style={{ maxWidth: 1400, top: 20, paddingBottom: 20 }}
        styles={{
          container: {
            borderRadius: 14,
            padding: "20px 24px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          },
          body: {
            maxHeight: "calc(88vh - 75px)",
            overflowY: "auto",
            overflowX: "hidden",
            paddingRight: 6,
          },
        }}
      >
        {selectedBug && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* Project & Title */}
            <div>
              <Tag color="cyan" style={{ marginBottom: 6 }}>
                Project: {selectedBug.projectId?.title || "Workspace"}
              </Tag>
              <Title level={4} style={{ margin: 0, color: "#0f172a" }}>
                {selectedBug.title}
              </Title>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                Reported on {dayjs(selectedBug.reportedAt).format("DD MMM YYYY, hh:mm A")} by{" "}
                <strong>{selectedBug.reportedBy?.name || "System"}</strong>
              </div>
            </div>

            {/* Metadata Grid */}
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
                        selectedBug.projectId?.techOwner?.name ||
                        "Project Manager (QA)"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      QA Status: <strong>{selectedBug.qaOutcome || selectedBug.status}</strong>
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
                      Reopened: {selectedBug.reopenCount ?? 0}x
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      Status: <strong>{selectedBug.status}</strong>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>

            {/* Problem Description */}
            <div>
              <Text strong style={{ fontSize: 12, textTransform: "uppercase", color: "#475569" }}>
                Problem Description
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

            {/* Resolution Snapshots */}
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
                  QA Verification Remarks
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

            <Divider style={{ margin: "10px 0" }} />

            {/* Audit Timeline */}
            <div>
              <Text strong style={{ fontSize: 13, textTransform: "uppercase", color: "#0f172a" }}>
                Immutable Audit Trail
              </Text>
              <div style={{ marginTop: 12 }}>
                {selectedBug.auditTrail && selectedBug.auditTrail.length > 0 ? (
                  <Timeline
                    items={selectedBug.auditTrail.map((entry: any, i: number) => ({
                      key: i,
                      children: (
                        <div style={{ paddingBottom: 6 }}>
                          <Space size={6} wrap>
                            <Tag color="blue" style={{ fontSize: 10, fontWeight: 700 }}>
                              {entry.action}
                            </Tag>
                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              {dayjs(entry.timestamp).format("DD MMM YYYY, hh:mm A")}
                            </span>
                            <span style={{ fontSize: 11, color: "#334155" }}>
                              by <strong>{entry.performedBy?.name || "User"}</strong>
                            </span>
                          </Space>

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
                            {entry.remarks}
                          </div>
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Text type="secondary" italic>
                    No audit entries recorded.
                  </Text>
                )}
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
