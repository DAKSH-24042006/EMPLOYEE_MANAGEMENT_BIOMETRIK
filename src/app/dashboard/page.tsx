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
  Grid
} from "antd";
import {
  ProjectOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as ReTooltip, 
  ResponsiveContainer 
} from "recharts";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface ProjectType {
  _id: string;
  clientDetails: {
    companyName: string;
    contactPerson: string;
    email: string;
  };
  features: {
    dashboard: boolean;
    webApp: boolean;
    androidApp: boolean;
    iosApp: boolean;
    adminPanel: boolean;
  };
  extraAddOns: string;
  timeline: {
    startDate: string;
    endDate: string;
  };
  status: "Pending" | "Active" | "Completed";
  createdAt: string;
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
      // Fetch Projects
      const projRes = await fetch("/api/projects");
      const projJson = await projRes.json();
      if (projRes.ok) {
        setData(projJson.data);
      }

      // Fetch Today's Tasks
      const today = new Date();
      const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const taskRes = await fetch(`/api/calendar-tasks?startDate=${start}&endDate=${end}`);
      const taskJson = await taskRes.json();
      if (taskRes.ok) {
        setTasks(taskJson);
      }
    } catch (e) {
      message.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, []);

  const statusCounts = {
    total: data.length,
    active: data.filter((p) => p.status === "Active").length,
    pending: data.filter((p) => p.status === "Pending").length,
    completed: data.filter((p) => p.status === "Completed").length,
  };

  const chartData = data.map((p, index) => ({
    name: p.clientDetails.companyName,
    value: 1,
    status: p.status,
    timeline: `${new Date(p.timeline.startDate).toLocaleDateString()} - ${new Date(p.timeline.endDate).toLocaleDateString()}`,
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

  const columns = [
    {
      title: "Task",
      dataIndex: "title",
      key: "title",
      render: (text: string) => <Text strong style={{ fontSize: 13 }}>{text}</Text>,
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 100,
      render: (priority: string) => {
        const colors: any = { Low: "blue", Medium: "orange", High: "volcano", Urgent: "red" };
        return <Tag color={colors[priority]}>{priority}</Tag>;
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: string) => {
        const colors: any = { Todo: "default", "In Progress": "processing", Done: "success", Cancelled: "error" };
        return <Tag color={colors[status]}>{status}</Tag>;
      },
    },
  ];

  return (
    <div style={{ 
      height: isDesktop ? "calc(100vh - 230px)" : "auto", 
      display: "flex", 
      flexDirection: "column", 
      overflow: isDesktop ? "hidden" : "visible" 
    }}>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Dashboard Overview</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>Welcome back. Here is your overview.</Text>
        </div>
      </div>

      <Skeleton loading={loading} active paragraph={{ rows: 1 }} style={{ flex: isDesktop ? 1 : "auto" }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {[
            {
              label: "Total Projects",
              value: statusCounts.total,
              color: "#00897b",
              bg: "#f0fdfa",
              icon: <ProjectOutlined style={{ fontSize: 22, color: "#00897b" }} />,
            },
            {
              label: "Active",
              value: statusCounts.active,
              color: "#3b82f6",
              bg: "#eff6ff",
              icon: <SyncOutlined style={{ fontSize: 22, color: "#3b82f6" }} />,
            },
            {
              label: "Pending",
              value: statusCounts.pending,
              color: "#f59e0b",
              bg: "#fffbeb",
              icon: <ClockCircleOutlined style={{ fontSize: 22, color: "#f59e0b" }} />,
            },
            {
              label: "Completed",
              value: statusCounts.completed,
              color: "#10b981",
              bg: "#ecfdf5",
              icon: <CheckCircleOutlined style={{ fontSize: 22, color: "#10b981" }} />,
            },
          ].map((card) => (
            <Col xs={12} sm={6} key={card.label}>
              <Card
                variant="borderless"
                style={{
                  borderRadius: 12,
                  background: card.bg,
                  border: `1px solid ${card.color}22`,
                }}
                styles={{ body: { padding: "12px 16px" } }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    }}
                  >
                    {card.icon}
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 22, fontWeight: 700, color: card.color, lineHeight: 1 }}
                    >
                      {card.value}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                      {card.label}
                    </div>
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]} style={{ flex: isDesktop ? 1 : "auto", minHeight: 0 }}>
          <Col xs={24} lg={10} style={{ height: isDesktop ? "100%" : "auto", marginBottom: isDesktop ? 0 : 16 }}>
            <Card 
              title={<span style={{ fontSize: 14, fontWeight: 600 }}><ProjectOutlined /> Project Distribution</span>}
              variant="borderless"
              style={{ 
                height: isDesktop ? "100%" : 350, 
                borderRadius: 12, 
                background: "#fff",
                boxShadow: "0 1px 10px rgba(0,0,0,0.05)",
                border: "1px solid #f0f0f0"
              }}
              styles={{ body: { height: isDesktop ? "calc(100% - 47px)" : "auto", padding: "10px" } }}
            >
              <div style={{ height: isDesktop ? "100%" : 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ReTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ 
                textAlign: "center", 
                position: "absolute", 
                top: isDesktop ? "54%" : "180px", 
                left: "50%", 
                transform: "translate(-50%, -50%)" 
              }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>{data.length}</div>
                <div style={{ fontSize: 10, color: "#6b7280" }}>Companies</div>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={14} style={{ height: isDesktop ? "100%" : "auto" }}>
            <Card 
              title={<span style={{ fontSize: 14, fontWeight: 600 }}><CalendarOutlined /> Today's Schedule</span>}
              variant="borderless"
              style={{ 
                height: isDesktop ? "100%" : 400, 
                borderRadius: 12, 
                background: "#fff",
                boxShadow: "0 1px 10px rgba(0,0,0,0.05)",
                border: "1px solid #f0f0f0"
              }}
              styles={{ body: { height: isDesktop ? "calc(100% - 47px)" : "auto", padding: 0, overflow: "auto" } }}
            >
              <Table 
                columns={columns} 
                dataSource={tasks} 
                pagination={false}
                rowKey="_id"
                size="small"
                locale={{ emptyText: <Text type="secondary" style={{ fontSize: 12 }}>No tasks for today</Text> }}
              />
            </Card>
          </Col>
        </Row>
      </Skeleton>
    </div>
  );
}
