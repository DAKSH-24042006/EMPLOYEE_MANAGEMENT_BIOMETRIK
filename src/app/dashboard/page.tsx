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
} from "antd";
import {
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CalendarOutlined,
  RightOutlined,
  AlertOutlined,
} from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from "recharts";
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
}

const COLORS = [
  "#00897b", "#3b82f6", "#f59e0b", "#10b981",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#6366f1", "#14b8a6"
];

const STATUS_COLOR_MAP: Record<string, string> = {
  "Requirement Created": "blue",
  "Submitted for Tech Review": "cyan",
  "Clarification Required": "orange",
  "Technically Approved": "purple",
  "Planning": "geekblue",
  "Development": "blue",
  "Testing/UAT": "gold",
  "Signoff Pending": "magenta",
  "Delivered": "green",
  "Closed": "default",
  "Pending": "orange",
  "Active": "blue",
  "Completed": "green",
};

export default function DashboardPage() {
  const [data, setData] = useState<ProjectType[]>([]);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const screens = useBreakpoint();
  const { message } = App.useApp();

  const isDesktop = mounted && screens.lg;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Projects with live progress and metrics
      const projRes = await fetch("/api/projects", { cache: "no-store" });
      const projJson = await projRes.json();
      if (projRes.ok) {
        setData(projJson.data || []);
      }

      // Fetch Today's Tasks
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      const taskRes = await fetch(`/api/calendar-tasks?startDate=${start}&endDate=${end}`, { cache: "no-store" });
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

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const isCompleted = (status: string) =>
    ["Completed", "Delivered", "Closed"].includes(status);
  const isPending = (status: string) =>
    ["Pending", "Requirement Created", "Clarification Required"].includes(status);
  const isActive = (status: string) =>
    !isCompleted(status) && !isPending(status);

  const totalProjects = data.length;
  const activeProjects = data.filter((p) => isActive(p.status)).length;
  const completedProjects = data.filter((p) => isCompleted(p.status)).length;
  const avgProgress = totalProjects > 0
    ? Math.round(data.reduce((acc, p) => acc + (p.progressPercent || 0), 0) / totalProjects)
    : 0;
  const totalBlockers = data.reduce((acc, p) => acc + (p.openBlockersCount || 0), 0);

  const chartData = data.map((p, index) => ({
    name: p.clientDetails?.companyName || p.title || "Project",
    value: 1,
    status: p.status,
    timeline: p.timeline ? `${dayjs(p.timeline.startDate).format("DD MMM")} - ${dayjs(p.timeline.endDate).format("DD MMM YYYY")}` : "N/A",
    color: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, status, timeline } = payload[0].payload;
      return (
        <div style={{
          background: "#fff",
          padding: "10px 14px",
          border: "1px solid #f0f0f0",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
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
      render: (text: string) => <Text strong style={{ fontSize: 13 }} title={text}>{text}</Text>,
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
        const colors: any = { Todo: "default", "In Progress": "processing", Done: "success", Cancelled: "error" };
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
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            {record.clientDetails?.companyName}
          </div>
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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: "#6b7280" }}>{pct}%</span>
              {record.activeSprint && record.activeSprint !== "None" && (
                <Tag color="geekblue" style={{ fontSize: 9, lineHeight: "14px", margin: 0 }}>
                  {record.activeSprint}
                </Tag>
              )}
            </div>
            <Progress percent={pct} showInfo={false} strokeColor={pct === 100 ? "#10b981" : "#00897b"} size="small" />
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
      <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Dashboard Overview</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Live performance, ongoing projects, and daily tasks.
          </Text>
        </div>
      </div>

      <Skeleton loading={loading} active paragraph={{ rows: 6 }} style={{ flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                subtitle: totalBlockers > 0 ? `${totalBlockers} active blocker(s)` : "Zero active blockers",
              },
              {
                label: "Today's Tasks",
                value: tasks.length,
                color: "#f59e0b",
                bg: "#fffbeb",
                icon: <CalendarOutlined style={{ fontSize: 22, color: "#f59e0b" }} />,
                subtitle: `${tasks.filter(t => t.status === "Done").length} completed today`,
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
                      <div style={{ fontSize: 24, fontWeight: 700, color: card.color, lineHeight: 1 }}>
                        {card.value}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 4 }}>
                        {card.label}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
                      <ProjectOutlined style={{ marginRight: 6, color: "#00897b" }} /> Live Projects & Progress
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
                  locale={{ emptyText: <div style={{ padding: 24, color: "#9ca3af" }}>No active projects</div> }}
                />
              </Card>
            </Col>

            <Col xs={24} lg={9}>
              <Card
                title={
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
                    <CalendarOutlined style={{ marginRight: 6, color: "#f59e0b" }} /> Today's Schedule & Tasks
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
                  locale={{ emptyText: <div style={{ padding: 28, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>No tasks scheduled for today</div> }}
                />
              </Card>
            </Col>
          </Row>

          {/* Bottom Row: Project Distribution Chart */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card
                title={<span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}><ProjectOutlined /> Project Distribution by Client</span>}
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
                  }
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
                  <div style={{
                    textAlign: "center",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none"
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", lineHeight: 1 }}>{data.length}</div>
                    <div style={{ fontSize: 11, color: "#6B7280", fontWeight: 500, marginTop: 2 }}>Projects</div>
                  </div>
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card
                title={<span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Project Health & Stage Summary</span>}
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#4b5563" }}>In Active Development / Testing:</span>
                    <strong style={{ fontSize: 14, color: "#3b82f6" }}>{activeProjects}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#4b5563" }}>Pending Review / Clarification:</span>
                    <strong style={{ fontSize: 14, color: "#f59e0b" }}>{data.filter(p => isPending(p.status)).length}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#4b5563" }}>Delivered / Completed:</span>
                    <strong style={{ fontSize: 14, color: "#10b981" }}>{completedProjects}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, color: "#4b5563" }}>Total Open Blockers:</span>
                    <strong style={{ fontSize: 14, color: totalBlockers > 0 ? "#ef4444" : "#10b981" }}>{totalBlockers}</strong>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
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
