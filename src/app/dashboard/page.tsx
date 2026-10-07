"use client";

import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Skeleton,
  App,
  Table,
  Tag,
  Grid,
  Progress,
  Badge,
  Space,
  Button,
  Select,
  Tooltip,
  Empty,
} from "antd";
import {
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CalendarOutlined,
  RightOutlined,
  AlertOutlined,
  PushpinOutlined,
  DeleteOutlined,
  PlusOutlined,
  CheckOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import dayjs from "dayjs";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface ProjectType {
  _id: string;
  title?: string;
  description?: string;
  clientDetails: {
    companyName: string;
    contactPerson?: string;
    email: string;
  };
  timeline: {
    startDate: string;
    endDate: string;
  };
  status: string;
  createdAt: string;
  progressPercent?: number;
  openBlockersCount?: number;
  overdueWorkItemsCount?: number;
  activeSprint?: string;
  techOwner?: {
    name: string;
    email: string;
    role: string;
  };
}

interface TaskType {
  _id: string;
  title: string;
  date: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Todo" | "In Progress" | "Done" | "Cancelled";
  color: string;
  projectName?: string;
  assigneeName?: string;
  itemType?: string;
}

const COLORS = [
  "#00897b",
  "#3b82f6",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#6366f1",
  "#14b8a6",
];

const STATUS_COLOR_MAP: Record<string, string> = {
  "Requirement Created": "blue",
  "Submitted for Tech Review": "cyan",
  "Clarification Required": "orange",
  "Technically Approved": "purple",
  Planning: "geekblue",
  Development: "blue",
  "Testing/UAT": "gold",
  "Signoff Pending": "magenta",
  Delivered: "green",
  Closed: "default",
  Pending: "orange",
  Active: "blue",
  Completed: "green",
};

export default function DashboardPage() {
  const [data, setData] = useState<ProjectType[]>([]);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pinnedProjects, setPinnedProjects] = useState<any[]>([]);
  const [pinningLoading, setPinningLoading] = useState(false);
  const [selectedProjectToPin, setSelectedProjectToPin] = useState<string | null>(null);

  const screens = useBreakpoint();
  const { message } = App.useApp();

  const isDesktop = mounted && screens.lg;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current user
      let loggedInUser: any = null;
      const userRes = await fetch("/api/user/me", { cache: "no-store" });
      if (userRes.ok) {
        const userJson = await userRes.json();
        loggedInUser = userJson.user || null;
        setCurrentUser(loggedInUser);
      }

      // Fetch Projects with live progress and metrics
      let projectList: any[] = [];
      const projRes = await fetch("/api/projects", { cache: "no-store" });
      const projJson = await projRes.json();
      if (projRes.ok) {
        projectList = projJson.data || [];
        setData(projectList);
      }

      // Check if user is Super Admin or assigned as Project Manager (techOwner) on any project
      const isSuperAdmin = loggedInUser?.role === "SYSTEM_ADMIN" || loggedInUser?.role === "ADMIN";
      const isPM = projectList.some(
        (p: any) =>
          String(p.techOwner?._id || p.techOwner) === String(loggedInUser?._id || loggedInUser?.id)
      );

      // Fetch pinned projects for super admin or project manager
      if (isSuperAdmin || isPM) {
        const pinnedRes = await fetch("/api/user/pinned-projects", { cache: "no-store" });
        if (pinnedRes.ok) {
          const pinnedJson = await pinnedRes.json();
          setPinnedProjects(pinnedJson.data || []);
        }
      }

      // Fetch Today's Tasks
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const taskRes = await fetch(
        `/api/calendar-tasks?startDate=${start}&endDate=${end}&includeAll=true`,
        { cache: "no-store" }
      );
      const taskJson = await taskRes.json();
      if (taskRes.ok) {
        setTasks(Array.isArray(taskJson) ? taskJson : []);
      }
    } catch {
      message.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPinnedProject = async (projectId: string) => {
    if (!projectId) return;
    setPinningLoading(true);
    try {
      const res = await fetch("/api/user/pinned-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (res.ok) {
        message.success("Project added to your priority shortcuts!");
        setSelectedProjectToPin(null);
        const pinnedRes = await fetch("/api/user/pinned-projects", { cache: "no-store" });
        if (pinnedRes.ok) {
          const pinnedJson = await pinnedRes.json();
          setPinnedProjects(pinnedJson.data || []);
        }
      } else {
        message.error(json.error || "Failed to add project shortcut");
      }
    } catch {
      message.error("Failed to add project shortcut");
    } finally {
      setPinningLoading(false);
    }
  };

  const handleRemovePinnedProject = async (projectId: string, isDone: boolean = false) => {
    setPinningLoading(true);
    try {
      const res = await fetch(`/api/user/pinned-projects?projectId=${projectId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        message.success(
          isDone
            ? "Project marked as done and removed from shortcuts!"
            : "Project removed from shortcuts"
        );
        setPinnedProjects((prev) => prev.filter((p) => String(p._id || p) !== String(projectId)));
      } else {
        message.error("Failed to remove project from shortcuts");
      }
    } catch {
      message.error("Failed to remove project from shortcuts");
    } finally {
      setPinningLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const isCompleted = (status: string) => ["Completed", "Delivered", "Closed"].includes(status);
  const isPending = (status: string) =>
    ["Pending", "Requirement Created", "Clarification Required"].includes(status);
  const isActive = (status: string) => !isCompleted(status);

  const isSuperAdmin = currentUser?.role === "SYSTEM_ADMIN" || currentUser?.role === "ADMIN";

  const isProjectManager = data.some(
    (p: any) =>
      String(p.techOwner?._id || p.techOwner) === String(currentUser?._id || currentUser?.id)
  );

  const isSuperAdminOrPM = isSuperAdmin || isProjectManager;

  const pinnedIds = new Set(pinnedProjects.map((p: any) => String(p._id || p)));
  const availableProjectsToPin = data.filter((p) => !pinnedIds.has(String(p._id)));

  const totalProjects = data.length;
  const activeProjects = data.filter((p) => isActive(p.status)).length;
  const completedProjects = data.filter((p) => isCompleted(p.status)).length;
  const avgProgress =
    totalProjects > 0
      ? Math.round(data.reduce((acc, p) => acc + (p.progressPercent || 0), 0) / totalProjects)
      : 0;
  const totalBlockers = data.reduce((acc, p) => acc + (p.openBlockersCount || 0), 0);

  const chartData = data.map((p, index) => ({
    name: p.clientDetails?.companyName || p.title || "Project",
    value: 1,
    status: p.status,
    timeline: p.timeline
      ? `${dayjs(p.timeline.startDate).format("DD MMM")} - ${dayjs(p.timeline.endDate).format("DD MMM YYYY")}`
      : "N/A",
    color: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, status, timeline } = payload[0].payload;
      return (
        <div
          style={{
            background: "#fff",
            padding: "10px 14px",
            border: "1px solid #f0f0f0",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontWeight: 600, color: "#111827", marginBottom: 4 }}>{name}</div>
          <div style={{ fontSize: 12, color: "#4b5563" }}>
            <span style={{ fontWeight: 500 }}>Status:</span> {status}
          </div>
          <div style={{ fontSize: 12, color: "#4b5563" }}>
            <span style={{ fontWeight: 500 }}>Timeline:</span> {timeline}
          </div>
        </div>
      );
    }
    return null;
  };

  const scheduleColumns = [
    {
      title: "Task Title",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
      render: (text: string, record: TaskType) => (
        <div>
          <Text strong style={{ fontSize: 13 }} title={text}>
            {text}
          </Text>
          {record.projectName && (
            <div style={{ fontSize: 11, color: "#6b7280" }}>{record.projectName}</div>
          )}
        </div>
      ),
    },
    {
      title: "Assignee",
      dataIndex: "assigneeName",
      key: "assigneeName",
      width: 130,
      render: (text: string) => <Text style={{ fontSize: 12 }}>{text || "Unassigned"}</Text>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 90,
      render: (priority: string) => {
        const colors: any = { Low: "blue", Medium: "orange", High: "volcano", Urgent: "red" };
        return <Tag color={colors[priority] || "default"}>{priority}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => {
        const colors: any = {
          Todo: "default",
          "In Progress": "processing",
          Done: "success",
          Cancelled: "error",
        };
        return <Tag color={colors[status] || "default"}>{status}</Tag>;
      },
    },
  ];

  const projectDeliveryColumns = [
    {
      title: "Project / Client",
      key: "project",
      render: (_: any, record: ProjectType) => (
        <div>
          <Link href={`/projects/${record._id}`}>
            <Text strong style={{ color: "#00897b", cursor: "pointer", fontSize: 13 }}>
              {record.title || "Unnamed Project"}
            </Text>
          </Link>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{record.clientDetails?.companyName}</div>
        </div>
      ),
    },
    {
      title: "Stage",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (st: string) => (
        <Tag color={STATUS_COLOR_MAP[st] || "default"} style={{ borderRadius: 10, fontSize: 11 }}>
          {st}
        </Tag>
      ),
    },
    {
      title: "Delivery Progress",
      key: "progress",
      width: 160,
      render: (_: any, record: ProjectType) => {
        const pct = record.progressPercent || 0;
        return (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                marginBottom: 2,
              }}
            >
              <span style={{ color: "#6b7280" }}>{pct}%</span>
              {record.activeSprint && record.activeSprint !== "None" && (
                <Tag color="geekblue" style={{ fontSize: 9, lineHeight: "14px", margin: 0 }}>
                  {record.activeSprint}
                </Tag>
              )}
            </div>
            <Progress
              percent={pct}
              showInfo={false}
              strokeColor={pct === 100 ? "#10b981" : "#00897b"}
              size="small"
            />
          </div>
        );
      },
    },
    {
      title: "Project Manager",
      key: "lead",
      width: 140,
      render: (_: any, record: ProjectType) => (
        <Text style={{ fontSize: 12, color: "#4b5563" }}>
          {record.techOwner?.name || "Unassigned"}
        </Text>
      ),
    },
    {
      title: "Action",
      key: "action",
      width: 90,
      render: (_: any, record: ProjectType) => (
        <Link href={`/projects/${record._id}`}>
          <Button size="small" type="link" style={{ color: "#00897b", padding: 0 }}>
            Open <RightOutlined style={{ fontSize: 10 }} />
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: "100%" }}>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Dashboard Overview
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Live performance, ongoing projects, and daily tasks.
          </Text>
        </div>
      </div>

      <Skeleton loading={loading} active paragraph={{ rows: 6 }} style={{ flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Personal Priority Project Shortcuts for Super Admin & Project Managers */}
          {isSuperAdminOrPM && (
            <Card
              variant="borderless"
              style={{
                borderRadius: 14,
                border: "1px solid #e2e8f0",
                background: "linear-gradient(135deg, #ffffff 0%, #f0fdfa 100%)",
                boxShadow: "0 2px 10px rgba(0, 137, 123, 0.05)",
              }}
              styles={{ body: { padding: "18px 20px" } }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: pinnedProjects.length > 0 ? 16 : 6,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <PushpinOutlined style={{ color: "#00897b", fontSize: 18 }} />
                    <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                      My Priority Project Shortcuts
                    </Title>
                    <Tag color="cyan" style={{ borderRadius: 10, fontWeight: 600 }}>
                      Quick Access ({pinnedProjects.length})
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Pin critical projects here for instant one-click access. Click &quot;Done&quot;
                    to remove anytime.
                  </Text>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Select
                    showSearch
                    placeholder="Search project to pin to shortcuts..."
                    loading={pinningLoading}
                    value={selectedProjectToPin}
                    onChange={(val) => {
                      setSelectedProjectToPin(val);
                      if (val) handleAddPinnedProject(val);
                    }}
                    filterOption={(input, option) =>
                      String(option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={availableProjectsToPin.map((p) => ({
                      label: `${p.title || p.clientDetails?.companyName || "Project"} (${p.status})`,
                      value: p._id,
                    }))}
                    style={{ width: 280 }}
                    allowClear
                  />
                </div>
              </div>

              {pinnedProjects.length === 0 ? (
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#ffffff",
                    borderRadius: 10,
                    border: "1px dashed #cbd5e1",
                    textAlign: "center",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    No priority projects pinned yet. Use the search bar above to pin the projects
                    you are currently monitoring.
                  </Text>
                </div>
              ) : (
                <Row gutter={[14, 14]}>
                  {pinnedProjects.map((pinned: any) => {
                    const pid = pinned._id || pinned;
                    const fullProj = data.find((p) => p._id === pid) || pinned;
                    const title =
                      fullProj.title || fullProj.clientDetails?.companyName || "Project";
                    const company = fullProj.clientDetails?.companyName;
                    const status = fullProj.status || "Active";
                    const progress = fullProj.progressPercent || 0;
                    const statusColor = STATUS_COLOR_MAP[status] || "default";

                    return (
                      <Col xs={24} sm={12} md={8} lg={6} key={pid}>
                        <div
                          style={{
                            background: "#ffffff",
                            border: "1px solid #e2e8f0",
                            borderRadius: 12,
                            padding: "14px 16px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            height: "100%",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                            transition: "all 0.2s ease",
                            position: "relative",
                          }}
                          className="hover:shadow-md hover:border-teal-500"
                        >
                          <div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: 8,
                                marginBottom: 6,
                              }}
                            >
                              <Link
                                href={`/projects/${pid}`}
                                style={{
                                  fontWeight: 600,
                                  fontSize: 14,
                                  color: "#0f172a",
                                  lineHeight: 1.3,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                                className="hover:text-teal-700"
                              >
                                {title}
                              </Link>
                              <Tooltip title="Remove shortcut">
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                                  onClick={() => handleRemovePinnedProject(pid, false)}
                                  style={{ padding: "0 4px", height: 22 }}
                                />
                              </Tooltip>
                            </div>

                            {company && company !== title && (
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: 12,
                                  display: "block",
                                  marginBottom: 8,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {company}
                              </Text>
                            )}

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 10,
                              }}
                            >
                              <Tag
                                color={statusColor}
                                style={{ margin: 0, borderRadius: 10, fontSize: 11 }}
                              >
                                {status}
                              </Tag>
                              {fullProj.openBlockersCount && fullProj.openBlockersCount > 0 ? (
                                <Tag
                                  color="error"
                                  style={{ margin: 0, borderRadius: 10, fontSize: 11 }}
                                >
                                  {fullProj.openBlockersCount} Blocked
                                </Tag>
                              ) : null}
                            </div>

                            <div style={{ marginBottom: 12 }}>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: 11,
                                  color: "#64748b",
                                  marginBottom: 3,
                                }}
                              >
                                <span>Progress</span>
                                <span style={{ fontWeight: 600, color: "#00897b" }}>
                                  {progress}%
                                </span>
                              </div>
                              <Progress
                                percent={progress}
                                size="small"
                                showInfo={false}
                                strokeColor={progress === 100 ? "#10b981" : "#00897b"}
                                style={{ margin: 0 }}
                              />
                            </div>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 8,
                              paddingTop: 10,
                              borderTop: "1px solid #f1f5f9",
                            }}
                          >
                            <Link href={`/projects/${pid}`} style={{ flex: 1 }}>
                              <Button
                                size="small"
                                type="primary"
                                block
                                style={{
                                  backgroundColor: "#00897b",
                                  borderColor: "#00897b",
                                  borderRadius: 6,
                                  fontSize: 12,
                                  fontWeight: 500,
                                }}
                              >
                                Open
                              </Button>
                            </Link>
                            <Tooltip title="Mark task done and remove from shortcuts">
                              <Button
                                size="small"
                                icon={<CheckOutlined style={{ fontSize: 12 }} />}
                                onClick={() => handleRemovePinnedProject(pid, true)}
                                style={{
                                  borderRadius: 6,
                                  fontSize: 12,
                                  borderColor: "#86efac",
                                  color: "#16a34a",
                                }}
                              >
                                Done
                              </Button>
                            </Tooltip>
                          </div>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Card>
          )}

          {/* Top Metric Cards */}
          <Row gutter={[16, 16]}>
            {[
              {
                label: "Total Projects",
                value: totalProjects,
                color: "#00897b",
                bg: "#f0fdfa",
                icon: <ProjectOutlined style={{ fontSize: 22, color: "#00897b" }} />,
                subtitle: `${completedProjects} completed / delivered`,
              },
              {
                label: "Active Projects",
                value: activeProjects,
                color: "#3b82f6",
                bg: "#eff6ff",
                icon: <SyncOutlined style={{ fontSize: 22, color: "#3b82f6" }} />,
                subtitle: "Currently in development / UAT",
              },
              {
                label: "Avg. Delivery Progress",
                value: `${avgProgress}%`,
                color: "#10b981",
                bg: "#ecfdf5",
                icon: <CheckCircleOutlined style={{ fontSize: 22, color: "#10b981" }} />,
                subtitle:
                  totalBlockers > 0 ? `${totalBlockers} active blocker(s)` : "Zero active blockers",
              },
              {
                label: "Today's Tasks",
                value: tasks.length,
                color: "#f59e0b",
                bg: "#fffbeb",
                icon: <CalendarOutlined style={{ fontSize: 22, color: "#f59e0b" }} />,
                subtitle: `${tasks.filter((t) => t.status === "Done").length} completed today`,
              },
            ].map((card) => (
              <Col xs={24} sm={12} lg={6} key={card.label}>
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 12,
                    background: card.bg,
                    border: `1px solid ${card.color}22`,
                  }}
                  styles={{ body: { padding: "14px 18px" } }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                        flexShrink: 0,
                      }}
                    >
                      {card.icon}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{ fontSize: 24, fontWeight: 700, color: card.color, lineHeight: 1 }}
                      >
                        {card.value}
                      </div>
                      <div
                        style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 4 }}
                      >
                        {card.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {card.subtitle}
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Main Content Rows: Project Delivery and Today's Schedule */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={15}>
              <Card
                title={
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
                      <ProjectOutlined style={{ marginRight: 6, color: "#00897b" }} /> Live Projects
                      & Progress
                    </span>
                    <Link href="/projects">
                      <Button size="small" type="link" style={{ color: "#00897b" }}>
                        View All ({data.length})
                      </Button>
                    </Link>
                  </div>
                }
                variant="borderless"
                style={{
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  border: "1px solid #f0f0f0",
                }}
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  columns={projectDeliveryColumns}
                  dataSource={data.slice(0, 6)}
                  rowKey="_id"
                  size="middle"
                  pagination={false}
                  scroll={{ x: 600 }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: 24, color: "#9ca3af" }}>No active projects</div>
                    ),
                  }}
                />
              </Card>
            </Col>

            <Col xs={24} lg={9}>
              <Card
                title={
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
                    <CalendarOutlined style={{ marginRight: 6, color: "#f59e0b" }} /> Today's
                    Schedule & Tasks
                  </span>
                }
                variant="borderless"
                style={{
                  height: "100%",
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  border: "1px solid #f0f0f0",
                }}
                styles={{ body: { padding: 0 } }}
              >
                <Table
                  columns={scheduleColumns}
                  dataSource={tasks}
                  pagination={false}
                  rowKey="_id"
                  size="small"
                  scroll={{ x: 300 }}
                  locale={{
                    emptyText: (
                      <div
                        style={{ padding: 28, textAlign: "center", color: "#9ca3af", fontSize: 12 }}
                      >
                        No tasks scheduled for today
                      </div>
                    ),
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* Bottom Row: Project Distribution Chart */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card
                title={
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    <ProjectOutlined /> Project Distribution by Client
                  </span>
                }
                variant="borderless"
                style={{
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  border: "1px solid #f0f0f0",
                }}
                styles={{
                  body: {
                    padding: "16px 10px",
                    display: "flex",
                    justifyContent: "center",
                    position: "relative",
                    minHeight: 240,
                  },
                }}
              >
                <div style={{ width: "100%", height: 220, position: "relative" }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ReTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div
                    style={{
                      textAlign: "center",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                      {data.length}
                    </div>
                    <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, marginTop: 2 }}>
                      Projects
                    </div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card
                title={
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                    Project Health & Stage Summary
                  </span>
                }
                variant="borderless"
                style={{
                  borderRadius: 12,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                  border: "1px solid #f0f0f0",
                  height: "100%",
                }}
                styles={{ body: { padding: "16px 20px" } }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#4b5563" }}>
                      In Active Development / Testing:
                    </span>
                    <strong style={{ fontSize: 14, color: "#3b82f6" }}>{activeProjects}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#4b5563" }}>
                      Pending Review / Clarification:
                    </span>
                    <strong style={{ fontSize: 14, color: "#f59e0b" }}>
                      {data.filter((p) => isPending(p.status)).length}
                    </strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#4b5563" }}>Delivered / Completed:</span>
                    <strong style={{ fontSize: 14, color: "#10b981" }}>{completedProjects}</strong>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#4b5563" }}>Total Open Blockers:</span>
                    <strong
                      style={{ fontSize: 14, color: totalBlockers > 0 ? "#ef4444" : "#10b981" }}
                    >
                      {totalBlockers}
                    </strong>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>Overall Fleet Progress</span>
                      <strong style={{ color: "#00897b" }}>{avgProgress}%</strong>
                    </div>
                    <Progress percent={avgProgress} strokeColor="#00897b" size="small" />
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Skeleton>
    </div>
  );
}
