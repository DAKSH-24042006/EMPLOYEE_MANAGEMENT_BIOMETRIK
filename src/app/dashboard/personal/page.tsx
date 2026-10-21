"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Skeleton,
  App,
  Button,
  Space,
  Empty,
  Tabs,
  Badge,
  Tooltip,
  Avatar,
  Modal,
  Select,
  DatePicker,
} from "antd";
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FolderOpenOutlined,
  RightOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  BugOutlined,
  FileTextOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FilterOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";
import { downloadBugPdf } from "@/lib/bugPdfGenerator";

const { Title, Text } = Typography;

export default function PersonalDashboardPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [bugs, setBugs] = useState<any[]>([]);
  const [reportedBugs, setReportedBugs] = useState<any[]>([]);
  const [personalProjectsCount, setPersonalProjectsCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Investigation Modal state
  const [selectedBug, setSelectedBug] = useState<any>(null);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);

  // ─── Section-Specific Filter States ──────────────────────────────────────
  // A. My Work Items Filters
  const [wiPriorityFilter, setWiPriorityFilter] = useState<string>("ALL");
  const [wiStatusFilter, setWiStatusFilter] = useState<string>("ALL");
  const [wiDatePreset, setWiDatePreset] = useState<string>("ALL");
  const [wiCustomDateRange, setWiCustomDateRange] = useState<any>(null);

  // B. My Tasks Filters
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("ALL");
  const [taskUrgencyFilter, setTaskUrgencyFilter] = useState<string>("ALL");

  // C. My Bugs Filters
  const [bugSeverityFilter, setBugSeverityFilter] = useState<string>("ALL");
  const [bugStatusFilter, setBugStatusFilter] = useState<string>("ALL");
  const [bugActionFilter, setBugActionFilter] = useState<string>("ALL");

  // D. My Upcoming Work / Deadlines Filters
  const [upcomingTimeframe, setUpcomingTimeframe] = useState<string>("ALL");
  const [upcomingTypeFilter, setUpcomingTypeFilter] = useState<string>("ALL");

  const { message } = App.useApp();

  const fetchPersonalData = async () => {
    setLoading(true);
    try {
      // 1. Fetch current user
      const userRes = await fetch("/api/user/me", { cache: "no-store" });
      if (userRes.ok) {
        const userJson = await userRes.json();
        setCurrentUser(userJson.user || null);
      }

      // 2. Fetch personal work (work-items, tasks, bugs)
      const workRes = await fetch("/api/user/personal-work", { cache: "no-store" });
      if (workRes.ok) {
        const workJson = await workRes.json();
        if (workJson.success && workJson.data) {
          setWorkItems(workJson.data.workItems || []);
          setTasks(workJson.data.tasks || []);
          setBugs(workJson.data.bugs || []);
          setReportedBugs(workJson.data.reportedBugs || []);
        }
      }

      // 3. Fetch personal projects count
      const ppRes = await fetch("/api/personal-projects", { cache: "no-store" });
      if (ppRes.ok) {
        const ppJson = await ppRes.json();
        setPersonalProjectsCount(Array.isArray(ppJson.data) ? ppJson.data.length : 0);
      }
    } catch {
      message.error("Failed to load personal workspace data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalData();
  }, []);

  const openBugDetails = (bug: any) => {
    setSelectedBug(bug);
    setIsBugModalOpen(true);
  };

  // ─── Work Items Columns ──────────────────────────────────────────────────
  const workItemColumns = [
    {
      title: "Work Item Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: any) => (
        <div>
          <Link
            href={record.projectId ? `/projects/${record.projectId}` : "#"}
            style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}
          >
            {text}
          </Link>
          {record.description && (
            <div
              style={{
                fontSize: 11.5,
                color: "#64748B",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 420,
              }}
            >
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Project",
      dataIndex: "projectName",
      key: "projectName",
      render: (name: string, record: any) =>
        record.projectId ? (
          <Link
            href={`/projects/${record.projectId}`}
            style={{ color: "#009587", fontWeight: 500, fontSize: 12.5 }}
          >
            {name}
          </Link>
        ) : (
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            {name}
          </Text>
        ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (p: string) => {
        const color =
          p === "Urgent" || p === "Critical"
            ? "red"
            : p === "High"
              ? "orange"
              : p === "Medium"
                ? "blue"
                : "default";
        return <Tag color={color}>{p || "Medium"}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => {
        const color =
          s === "Done" || s === "Completed"
            ? "success"
            : s === "In Progress" || s === "Testing"
              ? "processing"
              : s === "Blocked"
                ? "error"
                : "default";
        return <Tag color={color}>{s || "To Do"}</Tag>;
      },
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 130,
      render: (d: string, record: any) => {
        if (!d) return <span style={{ color: "#94a3b8", fontSize: 12 }}>Not set</span>;
        const isOverdue =
          dayjs(d).isBefore(dayjs(), "day") &&
          record.status !== "Done" &&
          record.status !== "Completed";
        return (
          <span
            style={{
              fontSize: 12,
              color: isOverdue ? "#DC2626" : "#334155",
              fontWeight: isOverdue ? 600 : 400,
            }}
          >
            {dayjs(d).format("DD MMM YYYY")}
            {isOverdue && (
              <span style={{ marginLeft: 4, fontSize: 10, color: "#DC2626" }}>(Overdue)</span>
            )}
          </span>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (_: any, record: any) =>
        record.projectId ? (
          <Link href={`/projects/${record.projectId}`}>
            <Button size="small" type="link" style={{ color: "#009587", padding: 0 }}>
              Open <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          </Link>
        ) : null,
    },
  ];

  // ─── Tasks Columns ───────────────────────────────────────────────────────
  const taskColumns = [
    {
      title: "Task Title",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: any) => (
        <div>
          <Text strong style={{ color: "#0F172A", fontSize: 13 }}>
            {text}
          </Text>
          {record.description && (
            <div
              style={{
                fontSize: 11.5,
                color: "#64748B",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 420,
              }}
            >
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Associated Project",
      dataIndex: "projectName",
      key: "projectName",
      render: (name: string, record: any) =>
        record.projectId ? (
          <Link
            href={`/projects/${record.projectId}`}
            style={{ color: "#009587", fontWeight: 500, fontSize: 12.5 }}
          >
            {name}
          </Link>
        ) : (
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            {name}
          </Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => {
        const color = s === "Completed" ? "success" : s === "Pending" ? "warning" : "error";
        return <Tag color={color}>{s || "Pending"}</Tag>;
      },
    },
    {
      title: "Due Date",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 150,
      render: (d: string, record: any) => {
        if (!d) return <span style={{ color: "#94a3b8", fontSize: 12 }}>Not set</span>;
        return (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontSize: 12,
                color: record.isOverdue ? "#DC2626" : "#334155",
                fontWeight: record.isOverdue ? 600 : 400,
              }}
            >
              {dayjs(d).format("DD MMM YYYY")}
            </span>
            {record.isOverdue && (
              <Tag
                color="error"
                style={{ margin: 0, fontSize: 10, lineHeight: "16px", padding: "0 4px" }}
              >
                Overdue
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: "Quick Link",
      key: "action",
      width: 80,
      render: (_: any, record: any) =>
        record.projectId ? (
          <Link href={`/projects/${record.projectId}`}>
            <Button size="small" type="link" style={{ color: "#009587", padding: 0 }}>
              Go <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          </Link>
        ) : null,
    },
  ];

  // ─── Upcoming Work Deadlines ─────────────────────────────────────────────
  const upcomingWork = useMemo(() => {
    const list: any[] = [];

    workItems.forEach((w) => {
      if (
        w.dueDate &&
        w.status !== "Done" &&
        w.status !== "Completed" &&
        w.status !== "Cancelled"
      ) {
        const d = dayjs(w.dueDate);
        const diff = d.diff(dayjs(), "day");
        list.push({
          _id: `wi_${w._id}`,
          title: w.title,
          category: "Work Item",
          type: w.type || "Task",
          priority: w.priority || "Medium",
          status: w.status,
          dueDate: w.dueDate,
          diffDays: diff,
          isOverdue: diff < 0,
          projectId: w.projectId,
          projectName: w.projectName,
        });
      }
    });

    tasks.forEach((t) => {
      if (
        t.dueDate &&
        t.status !== "Done" &&
        t.status !== "Completed" &&
        t.status !== "Cancelled"
      ) {
        const d = dayjs(t.dueDate);
        const diff = d.diff(dayjs(), "day");
        list.push({
          _id: `task_${t._id}`,
          title: t.title,
          category: "Task",
          type: "Calendar Task",
          priority: t.priority || "Medium",
          status: t.status,
          dueDate: t.dueDate,
          diffDays: diff,
          isOverdue: diff < 0,
          projectId: t.projectId,
          projectName: t.projectName,
        });
      }
    });

    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [workItems, tasks]);

  // ─── Filtered Lists for Each Section ─────────────────────────────────────
  // A. Filtered Work Items
  const filteredWorkItems = useMemo(() => {
    return workItems.filter((w) => {
      if (wiPriorityFilter !== "ALL") {
        const p = (w.priority || "Medium").toLowerCase();
        if (p !== wiPriorityFilter.toLowerCase()) return false;
      }
      if (wiStatusFilter !== "ALL") {
        const s = (w.status || "To Do").toLowerCase();
        const target = wiStatusFilter.toLowerCase();
        if (target === "done") {
          if (s !== "done" && s !== "completed") return false;
        } else if (s !== target) {
          return false;
        }
      }
      if (wiDatePreset === "THIS_WEEK") {
        if (!w.dueDate) return false;
        const d = dayjs(w.dueDate);
        const start = dayjs().startOf("week");
        const end = dayjs().endOf("week");
        if (d.isBefore(start, "day") || d.isAfter(end, "day")) return false;
      } else if (wiDatePreset === "THIS_MONTH") {
        if (!w.dueDate) return false;
        const d = dayjs(w.dueDate);
        const start = dayjs().startOf("month");
        const end = dayjs().endOf("month");
        if (d.isBefore(start, "day") || d.isAfter(end, "day")) return false;
      } else if (wiDatePreset === "CUSTOM") {
        if (!w.dueDate) return false;
        if (wiCustomDateRange && wiCustomDateRange[0] && wiCustomDateRange[1]) {
          const d = dayjs(w.dueDate);
          if (
            d.isBefore(dayjs(wiCustomDateRange[0]), "day") ||
            d.isAfter(dayjs(wiCustomDateRange[1]), "day")
          ) {
            return false;
          }
        }
      }
      return true;
    });
  }, [workItems, wiPriorityFilter, wiStatusFilter, wiDatePreset, wiCustomDateRange]);

  // B. Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (taskStatusFilter !== "ALL") {
        const isDone = t.status === "Completed" || t.status === "Done";
        if (taskStatusFilter === "Completed" && !isDone) return false;
        if (taskStatusFilter === "Pending" && isDone) return false;
      }
      if (taskUrgencyFilter === "OVERDUE") {
        const isOverdue =
          t.isOverdue ||
          (t.dueDate &&
            dayjs(t.dueDate).isBefore(dayjs(), "day") &&
            t.status !== "Completed" &&
            t.status !== "Done");
        if (!isOverdue) return false;
      } else if (taskUrgencyFilter === "UPCOMING") {
        const isUpcoming =
          t.dueDate &&
          !dayjs(t.dueDate).isBefore(dayjs(), "day") &&
          t.status !== "Completed" &&
          t.status !== "Done";
        if (!isUpcoming) return false;
      }
      return true;
    });
  }, [tasks, taskStatusFilter, taskUrgencyFilter]);

  // C. Filtered Bugs
  const applyBugFilters = (list: any[]) => {
    return list.filter((b) => {
      if (bugSeverityFilter !== "ALL") {
        if ((b.severity || "").toLowerCase() !== bugSeverityFilter.toLowerCase()) return false;
      }
      if (bugStatusFilter !== "ALL") {
        if ((b.status || "").toUpperCase() !== bugStatusFilter.toUpperCase()) return false;
      }
      if (bugActionFilter === "DEV_ACTION") {
        if (b.status !== "ASSIGNED" && b.status !== "FAIL") return false;
      } else if (bugActionFilter === "QA_ACTION") {
        if (b.status !== "FIXED") return false;
      }
      return true;
    });
  };

  const filteredAssignedBugs = useMemo(
    () => applyBugFilters(bugs),
    [bugs, bugSeverityFilter, bugStatusFilter, bugActionFilter]
  );

  const filteredReportedBugs = useMemo(
    () => applyBugFilters(reportedBugs),
    [reportedBugs, bugSeverityFilter, bugStatusFilter, bugActionFilter]
  );

  // D. Filtered Upcoming Work
  const filteredUpcomingWork = useMemo(() => {
    return upcomingWork.filter((u) => {
      if (upcomingTimeframe === "OVERDUE") {
        if (!u.isOverdue && u.diffDays >= 0) return false;
      } else if (upcomingTimeframe === "24H") {
        if (u.diffDays < 0 || u.diffDays > 1) return false;
      } else if (upcomingTimeframe === "7D") {
        if (u.diffDays < 0 || u.diffDays > 7) return false;
      } else if (upcomingTimeframe === "30D") {
        if (u.diffDays < 0 || u.diffDays > 30) return false;
      }
      if (upcomingTypeFilter !== "ALL") {
        if (u.category !== upcomingTypeFilter) return false;
      }
      return true;
    });
  }, [upcomingWork, upcomingTimeframe, upcomingTypeFilter]);

  const upcomingColumns = [
    {
      title: "Work Item / Task",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: any) => (
        <div>
          <Link
            href={record.projectId ? `/projects/${record.projectId}` : "#"}
            style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}
          >
            {text}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <Tag
              color={record.category === "Work Item" ? "geekblue" : "blue"}
              style={{ borderRadius: 6, fontSize: 10, margin: 0, padding: "0 6px" }}
            >
              {record.category}
            </Tag>
            <span style={{ fontSize: 11, color: "#64748B" }}>{record.type}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Project",
      dataIndex: "projectName",
      key: "projectName",
      render: (name: string, record: any) =>
        record.projectId ? (
          <Link
            href={`/projects/${record.projectId}`}
            style={{ color: "#009587", fontWeight: 500, fontSize: 12.5 }}
          >
            {name}
          </Link>
        ) : (
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            {name}
          </Text>
        ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (p: string) => {
        const color =
          p === "Urgent" || p === "Critical"
            ? "red"
            : p === "High"
              ? "orange"
              : p === "Medium"
                ? "blue"
                : "default";
        return <Tag color={color}>{p || "Medium"}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (s: string) => {
        const color =
          s === "Done" || s === "Completed"
            ? "success"
            : s === "In Progress" || s === "Testing"
              ? "processing"
              : s === "Blocked"
                ? "error"
                : "default";
        return <Tag color={color}>{s || "To Do"}</Tag>;
      },
    },
    {
      title: "Due Date & Timeline",
      dataIndex: "dueDate",
      key: "dueDate",
      width: 190,
      render: (d: string, record: any) => {
        const diff = record.diffDays;
        return (
          <div>
            <div
              style={{
                fontWeight: 500,
                fontSize: 12.5,
                color: record.isOverdue ? "#DC2626" : "#1E293B",
              }}
            >
              {dayjs(d).format("DD MMM YYYY")}
            </div>
            <div style={{ marginTop: 2 }}>
              {record.isOverdue ? (
                <Tag color="error" style={{ borderRadius: 10, fontSize: 10, padding: "0 6px" }}>
                  {Math.abs(diff)}d Overdue
                </Tag>
              ) : diff === 0 ? (
                <Tag color="warning" style={{ borderRadius: 10, fontSize: 10, padding: "0 6px" }}>
                  Due Today
                </Tag>
              ) : (
                <Tag
                  color="processing"
                  style={{ borderRadius: 10, fontSize: 10, padding: "0 6px" }}
                >
                  Due in {diff}d
                </Tag>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: "Action",
      key: "action",
      width: 80,
      render: (_: any, record: any) =>
        record.projectId ? (
          <Link href={`/projects/${record.projectId}`}>
            <Button size="small" type="link" style={{ color: "#009587", padding: 0 }}>
              Open <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          </Link>
        ) : null,
    },
  ];

  // ─── Bugs Columns ────────────────────────────────────────────────────────
  const renderBugSeverity = (sev: string) => {
    const map: any = {
      Severe: { color: "red", text: "Severe" },
      High: { color: "volcano", text: "High" },
      Medium: { color: "gold", text: "Medium" },
      Low: { color: "blue", text: "Low" },
    };
    const c = map[sev] || { color: "default", text: sev };
    return <Tag color={c.color}>{c.text}</Tag>;
  };

  const bugColumns = [
    {
      title: "Bug ID",
      dataIndex: "bugId",
      key: "bugId",
      width: 115,
      render: (id: string, record: any) => (
        <a
          onClick={() => openBugDetails(record)}
          style={{ fontWeight: 700, color: "#009587", fontSize: 13 }}
        >
          {id}
        </a>
      ),
    },
    {
      title: "Bug Title",
      dataIndex: "title",
      key: "title",
      render: (title: string, record: any) => (
        <div>
          <a
            onClick={() => openBugDetails(record)}
            style={{ fontWeight: 600, color: "#0F172A", fontSize: 13 }}
          >
            {title}
          </a>
          {record.description && (
            <div
              style={{
                fontSize: 11.5,
                color: "#64748B",
                marginTop: 2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 380,
              }}
            >
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "Project",
      dataIndex: "projectName",
      key: "projectName",
      render: (name: string, record: any) =>
        record.projectId ? (
          <Link
            href={`/projects/${record.projectId}`}
            style={{ color: "#009587", fontWeight: 500, fontSize: 12.5 }}
          >
            {name}
          </Link>
        ) : (
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            {name}
          </Text>
        ),
    },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (sev: string) => renderBugSeverity(sev),
    },
    {
      title: "Assigned Date",
      dataIndex: "assignedAt",
      key: "assignedAt",
      width: 130,
      render: (d: string) => (
        <span style={{ fontSize: 12, color: d ? "#334155" : "#94a3b8" }}>
          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (s: string) => {
        const color =
          s === "PASS"
            ? "success"
            : s === "FIXED"
              ? "processing"
              : s === "FAIL"
                ? "error"
                : "warning";
        return <Tag color={color}>{s || "OPEN"}</Tag>;
      },
    },
    {
      title: "Reported Date",
      dataIndex: "reportedAt",
      key: "reportedAt",
      width: 130,
      render: (d: string) => (
        <span style={{ fontSize: 12, color: "#64748B" }}>
          {d ? dayjs(d).format("DD MMM YYYY") : "—"}
        </span>
      ),
    },
    {
      title: "Investigation",
      key: "action",
      width: 120,
      render: (_: any, record: any) => (
        <Button
          size="small"
          type="link"
          icon={<EyeOutlined />}
          onClick={() => openBugDetails(record)}
          style={{ color: "#009587", padding: 0 }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40, width: "100%" }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          background: "#ffffff",
          padding: "20px 24px",
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: "#0F172A", fontWeight: 700 }}>
            Personal Dashboard
          </Title>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: "block" }}>
            Welcome back, {currentUser?.name || "User"}. Here is your assigned work items, tasks,
            and bugs.
          </Text>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchPersonalData} loading={loading}>
            Refresh
          </Button>
          <Link href="/dashboard/personal-projects">
            <Button
              type="primary"
              icon={<FolderOpenOutlined />}
              style={{ backgroundColor: "#009587", borderColor: "#009587" }}
            >
              Favourite Projects ({personalProjectsCount})
            </Button>
          </Link>
        </Space>
      </div>

      <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
        {/* ── Summary KPI Cards ───────────────────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                background: "#F0FDFA",
              }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                My Assigned Work Items
              </Text>
              <Title level={2} style={{ margin: "6px 0 0", color: "#009587" }}>
                {workItems.length}
              </Title>
              <Text style={{ fontSize: 11.5, color: "#64748B", display: "block", marginTop: 4 }}>
                {workItems.filter((w) => w.status !== "Done" && w.status !== "Completed").length}{" "}
                pending execution
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                background: "#EFF6FF",
              }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                My Tasks
              </Text>
              <Title level={2} style={{ margin: "6px 0 0", color: "#2563EB" }}>
                {tasks.length}
              </Title>
              <Text style={{ fontSize: 11.5, color: "#64748B", display: "block", marginTop: 4 }}>
                {tasks.filter((t) => t.isOverdue).length} overdue tasks
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                background: "#FFFBEB",
              }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                My Assigned Bugs
              </Text>
              <Title level={2} style={{ margin: "6px 0 0", color: "#D97706" }}>
                {bugs.length}
              </Title>
              <Text style={{ fontSize: 11.5, color: "#64748B", display: "block", marginTop: 4 }}>
                {bugs.filter((b) => b.status === "OPEN" || b.status === "FAIL").length} open defects
              </Text>
            </Card>
          </Col>

          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                background: "#FFF1F2",
              }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              <Text type="secondary" style={{ fontSize: 12 }}>
                My Upcoming Deadlines
              </Text>
              <Title level={2} style={{ margin: "6px 0 0", color: "#E11D48" }}>
                {upcomingWork.length}
              </Title>
              <Text style={{ fontSize: 11.5, color: "#64748B", display: "block", marginTop: 4 }}>
                {upcomingWork.filter((u) => u.isOverdue).length} overdue,{" "}
                {upcomingWork.filter((u) => !u.isOverdue).length} upcoming
              </Text>
            </Card>
          </Col>
        </Row>

        {/* ── Section A: My Work Items ────────────────────────────────────── */}
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileTextOutlined style={{ color: "#009587" }} />
              <span style={{ fontWeight: 650, fontSize: 14 }}>
                My Work Items ({workItems.length})
              </span>
            </div>
          }
          style={{ borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 20 }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Work Items Filter Toolbar */}
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Space wrap size={10} align="center">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748B",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FilterOutlined style={{ fontSize: 12 }} /> Filters:
              </span>
              <Select
                size="small"
                value={wiPriorityFilter}
                onChange={setWiPriorityFilter}
                style={{ width: 140 }}
                options={[
                  { value: "ALL", label: "All Priorities" },
                  { value: "Critical", label: "Critical" },
                  { value: "High", label: "High" },
                  { value: "Medium", label: "Medium" },
                  { value: "Low", label: "Low" },
                ]}
              />
              <Select
                size="small"
                value={wiStatusFilter}
                onChange={setWiStatusFilter}
                style={{ width: 140 }}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "To Do", label: "To Do" },
                  { value: "In Progress", label: "In Progress" },
                  { value: "Testing", label: "Testing" },
                  { value: "Blocked", label: "Blocked" },
                  { value: "Done", label: "Done" },
                ]}
              />
              <Select
                size="small"
                value={wiDatePreset}
                onChange={(v) => {
                  setWiDatePreset(v);
                  if (v !== "CUSTOM") setWiCustomDateRange(null);
                }}
                style={{ width: 155 }}
                options={[
                  { value: "ALL", label: "All Due Dates" },
                  { value: "THIS_WEEK", label: "Due This Week" },
                  { value: "THIS_MONTH", label: "Due This Month" },
                  { value: "CUSTOM", label: "Custom Date Range" },
                ]}
              />
              {wiDatePreset === "CUSTOM" && (
                <DatePicker.RangePicker
                  size="small"
                  value={wiCustomDateRange}
                  onChange={setWiCustomDateRange}
                  style={{ borderRadius: 6 }}
                />
              )}
              {(wiPriorityFilter !== "ALL" ||
                wiStatusFilter !== "ALL" ||
                wiDatePreset !== "ALL") && (
                <Button
                  size="small"
                  type="link"
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setWiPriorityFilter("ALL");
                    setWiStatusFilter("ALL");
                    setWiDatePreset("ALL");
                    setWiCustomDateRange(null);
                  }}
                  style={{ color: "#EF4444", padding: 0 }}
                >
                  Reset
                </Button>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Showing {filteredWorkItems.length} of {workItems.length}
            </Text>
          </div>

          {workItems.length === 0 ? (
            <Empty
              description="No work items assigned to you"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: "32px 0" }}
            />
          ) : filteredWorkItems.length === 0 ? (
            <Empty
              description="No work items match the selected filters"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: "32px 0" }}
            />
          ) : (
            <Table
              dataSource={filteredWorkItems}
              columns={workItemColumns}
              rowKey="_id"
              pagination={{ pageSize: 5, showSizeChanger: true }}
              size="middle"
              scroll={{ x: 800 }}
            />
          )}
        </Card>

        {/* ── Section B: My Tasks ─────────────────────────────────────────── */}
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CalendarOutlined style={{ color: "#2563EB" }} />
              <span style={{ fontWeight: 650, fontSize: 14 }}>My Tasks ({tasks.length})</span>
            </div>
          }
          style={{ borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 20 }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Tasks Filter Toolbar */}
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Space wrap size={10} align="center">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748B",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FilterOutlined style={{ fontSize: 12 }} /> Filters:
              </span>
              <Select
                size="small"
                value={taskStatusFilter}
                onChange={setTaskStatusFilter}
                style={{ width: 140 }}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "Pending", label: "Pending" },
                  { value: "Completed", label: "Completed" },
                ]}
              />
              <Select
                size="small"
                value={taskUrgencyFilter}
                onChange={setTaskUrgencyFilter}
                style={{ width: 155 }}
                options={[
                  { value: "ALL", label: "All Urgency" },
                  { value: "OVERDUE", label: "Overdue Tasks" },
                  { value: "UPCOMING", label: "Upcoming Tasks" },
                ]}
              />
              {(taskStatusFilter !== "ALL" || taskUrgencyFilter !== "ALL") && (
                <Button
                  size="small"
                  type="link"
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setTaskStatusFilter("ALL");
                    setTaskUrgencyFilter("ALL");
                  }}
                  style={{ color: "#EF4444", padding: 0 }}
                >
                  Reset
                </Button>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Showing {filteredTasks.length} of {tasks.length}
            </Text>
          </div>

          {tasks.length === 0 ? (
            <Empty
              description="No tasks assigned to you"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: "32px 0" }}
            />
          ) : filteredTasks.length === 0 ? (
            <Empty
              description="No tasks match the selected filters"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: "32px 0" }}
            />
          ) : (
            <Table
              dataSource={filteredTasks}
              columns={taskColumns}
              rowKey="_id"
              pagination={{ pageSize: 5, showSizeChanger: true }}
              size="middle"
              scroll={{ x: 750 }}
            />
          )}
        </Card>

        {/* ── Section C: My Upcoming Work ─────────────────────────────────── */}
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClockCircleOutlined style={{ color: "#E11D48" }} />
              <span style={{ fontWeight: 650, fontSize: 14 }}>
                My Upcoming Work ({upcomingWork.length})
              </span>
            </div>
          }
          style={{ borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 20 }}
          styles={{ body: { padding: 0 } }}
        >
          {/* Upcoming Work Filter Toolbar */}
          <div
            style={{
              padding: "10px 16px",
              background: "#f8fafc",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <Space wrap size={10} align="center">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748B",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FilterOutlined style={{ fontSize: 12 }} /> Filters:
              </span>
              <Select
                size="small"
                value={upcomingTimeframe}
                onChange={setUpcomingTimeframe}
                style={{ width: 165 }}
                options={[
                  { value: "ALL", label: "All Deadlines" },
                  { value: "OVERDUE", label: "Overdue" },
                  { value: "24H", label: "Due in 24 Hours" },
                  { value: "7D", label: "Due Next 7 Days" },
                  { value: "30D", label: "Due Next 30 Days" },
                ]}
              />
              <Select
                size="small"
                value={upcomingTypeFilter}
                onChange={setUpcomingTypeFilter}
                style={{ width: 155 }}
                options={[
                  { value: "ALL", label: "All Item Types" },
                  { value: "Work Item", label: "Work Items" },
                  { value: "Task", label: "Calendar Tasks" },
                ]}
              />
              {(upcomingTimeframe !== "ALL" || upcomingTypeFilter !== "ALL") && (
                <Button
                  size="small"
                  type="link"
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setUpcomingTimeframe("ALL");
                    setUpcomingTypeFilter("ALL");
                  }}
                  style={{ color: "#EF4444", padding: 0 }}
                >
                  Reset
                </Button>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Showing {filteredUpcomingWork.length} of {upcomingWork.length}
            </Text>
          </div>

          {upcomingWork.length === 0 ? (
            <Empty
              description="No upcoming deadlines on your assigned work"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: "32px 0" }}
            />
          ) : filteredUpcomingWork.length === 0 ? (
            <Empty
              description="No upcoming items match the selected filters"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: "32px 0" }}
            />
          ) : (
            <Table
              dataSource={filteredUpcomingWork}
              columns={upcomingColumns}
              rowKey="_id"
              pagination={{ pageSize: 5, showSizeChanger: true }}
              size="middle"
              scroll={{ x: 750 }}
            />
          )}
        </Card>

        {/* ── Section D: My Bugs ──────────────────────────────────────────── */}
        <Card
          title={
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BugOutlined style={{ color: "#D97706" }} />
              <span style={{ fontWeight: 650, fontSize: 14 }}>My Bugs</span>
            </div>
          }
          style={{ borderRadius: 12, border: "1px solid #E2E8F0" }}
          styles={{ body: { padding: "12px 16px" } }}
        >
          {/* Bugs Filter Toolbar */}
          <div
            style={{
              padding: "10px 14px",
              background: "#f8fafc",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <Space wrap size={10} align="center">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#64748B",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <FilterOutlined style={{ fontSize: 12 }} /> Filters:
              </span>
              <Select
                size="small"
                value={bugSeverityFilter}
                onChange={setBugSeverityFilter}
                style={{ width: 135 }}
                options={[
                  { value: "ALL", label: "All Severities" },
                  { value: "Severe", label: "Severe" },
                  { value: "High", label: "High" },
                  { value: "Medium", label: "Medium" },
                  { value: "Low", label: "Low" },
                ]}
              />
              <Select
                size="small"
                value={bugStatusFilter}
                onChange={setBugStatusFilter}
                style={{ width: 145 }}
                options={[
                  { value: "ALL", label: "All Statuses" },
                  { value: "OPEN", label: "OPEN" },
                  { value: "ASSIGNED", label: "ASSIGNED" },
                  { value: "FIXED", label: "FIXED" },
                  { value: "PASS", label: "PASS" },
                  { value: "FAIL", label: "FAIL (Reopened)" },
                ]}
              />
              <Select
                size="small"
                value={bugActionFilter}
                onChange={setBugActionFilter}
                style={{ width: 235 }}
                options={[
                  { value: "ALL", label: "All Action States" },
                  { value: "DEV_ACTION", label: "Action: Needs Fix (ASSIGNED/FAIL)" },
                  { value: "QA_ACTION", label: "Action: Needs QA Verify (FIXED)" },
                ]}
              />
              {(bugSeverityFilter !== "ALL" ||
                bugStatusFilter !== "ALL" ||
                bugActionFilter !== "ALL") && (
                <Button
                  size="small"
                  type="link"
                  icon={<ClearOutlined />}
                  onClick={() => {
                    setBugSeverityFilter("ALL");
                    setBugStatusFilter("ALL");
                    setBugActionFilter("ALL");
                  }}
                  style={{ color: "#EF4444", padding: 0 }}
                >
                  Reset
                </Button>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Assigned: {filteredAssignedBugs.length}/{bugs.length} · Reported:{" "}
              {filteredReportedBugs.length}/{reportedBugs.length}
            </Text>
          </div>

          <Tabs
            defaultActiveKey="assigned"
            items={[
              {
                key: "assigned",
                label: `Assigned to Me (${filteredAssignedBugs.length})`,
                children:
                  bugs.length === 0 ? (
                    <Empty
                      description="No bugs currently assigned to you"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: "24px 0" }}
                    />
                  ) : filteredAssignedBugs.length === 0 ? (
                    <Empty
                      description="No assigned bugs match the selected filters"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: "24px 0" }}
                    />
                  ) : (
                    <Table
                      dataSource={filteredAssignedBugs}
                      columns={bugColumns}
                      rowKey="_id"
                      pagination={{ pageSize: 5, showSizeChanger: true }}
                      size="middle"
                      scroll={{ x: 800 }}
                    />
                  ),
              },
              {
                key: "reported",
                label: `Reported by Me (${filteredReportedBugs.length})`,
                children:
                  reportedBugs.length === 0 ? (
                    <Empty
                      description="No bugs reported by you"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: "24px 0" }}
                    />
                  ) : filteredReportedBugs.length === 0 ? (
                    <Empty
                      description="No reported bugs match the selected filters"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ padding: "24px 0" }}
                    />
                  ) : (
                    <Table
                      dataSource={filteredReportedBugs}
                      columns={bugColumns}
                      rowKey="_id"
                      pagination={{ pageSize: 5, showSizeChanger: true }}
                      size="middle"
                      scroll={{ x: 800 }}
                    />
                  ),
              },
            ]}
          />
        </Card>
      </Skeleton>

      {/* ── Investigation Details Centered Modal Sheet ───────────────────── */}
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
                {renderBugSeverity(selectedBug.severity)}
                <Tag color={selectedBug.status === "PASS" ? "success" : "warning"}>
                  {selectedBug.status}
                </Tag>
              </div>
              <Button
                size="small"
                icon={<FilePdfOutlined />}
                onClick={() => downloadBugPdf(selectedBug, selectedBug.projectName)}
                style={{ borderColor: "#009587", color: "#009587" }}
              >
                Export PDF
              </Button>
            </div>
          ) : (
            "Investigation Details"
          )
        }
        open={isBugModalOpen}
        onCancel={() => setIsBugModalOpen(false)}
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
            <div>
              <Tag color="cyan" style={{ marginBottom: 6 }}>
                Project: {selectedBug.projectName}
              </Tag>
              <Title level={4} style={{ margin: 0, color: "#0F172A" }}>
                {selectedBug.title}
              </Title>
              <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>
                Reported on {dayjs(selectedBug.reportedAt).format("DD MMM YYYY, hh:mm A")}
                {selectedBug.reportedByName && (
                  <span>
                    {" "}
                    by <strong>{selectedBug.reportedByName}</strong>
                  </span>
                )}
              </div>
            </div>

            <Card
              size="small"
              title="Defect Description"
              style={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
            >
              <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                {selectedBug.description || "No description provided."}
              </div>
            </Card>

            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 10,
                    background: "#F8FAFC",
                    borderRadius: 6,
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    ASSIGNED DATE
                  </Text>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>
                    {selectedBug.assignedAt
                      ? dayjs(selectedBug.assignedAt).format("DD MMM YYYY")
                      : "Unassigned"}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 10,
                    background: "#F8FAFC",
                    borderRadius: 6,
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    SEVERITY LEVEL
                  </Text>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>
                    {selectedBug.severity}
                  </div>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    padding: 10,
                    background: "#F8FAFC",
                    borderRadius: 6,
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                    CURRENT STATUS
                  </Text>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginTop: 2 }}>
                    {selectedBug.status}
                  </div>
                </div>
              </Col>
            </Row>

            {selectedBug.projectId && (
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <Link href={`/projects/${selectedBug.projectId}`}>
                  <Button
                    type="primary"
                    style={{ backgroundColor: "#009587", borderColor: "#009587" }}
                  >
                    Open Project Workspace <RightOutlined />
                  </Button>
                </Link>
              </div>
            )}
          </Space>
        )}
      </Modal>
    </div>
  );
}
