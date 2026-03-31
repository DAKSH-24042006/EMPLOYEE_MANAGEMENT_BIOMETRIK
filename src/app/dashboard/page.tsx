"use client";

import React, { useEffect, useState } from "react";
import { 
  Typography, 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Table, 
  Tag, 
  Select, 
  Button, 
  Drawer, 
  Descriptions, 
  Input,
  Space,
  Skeleton,
  App
} from "antd";
import { ArrowUpRight, Users, Activity, BarChart2, Search, Eye, CheckCircle, Clock, AlertCircle } from "lucide-react";
import type { TableProps } from "antd";

type ColumnsType<T> = TableProps<T>["columns"];
type ColumnType<T> = NonNullable<TableProps<T>["columns"]>[number];

const { Title, Text } = Typography;

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
  status: "Pending" | "Active" | "Completed" | "Reviewed" | "Approved";
  createdAt: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedProject, setSelectedReq] = useState<ProjectType | null>(null);
  
  // Destructure context-aware instances from App
  const { message } = App.useApp();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const json = await res.json();
      if (res.ok) {
        setData(json.data);
      }
    } catch (e) {
      message.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    completed: data.filter(p => p.status === "Completed").length,
    active: data.filter(p => p.status === "Active" && new Date(p.timeline.endDate) >= new Date()).length,
    pending: data.filter(p => p.status === "Pending" && new Date(p.timeline.endDate) >= new Date()).length,
    overdue: data.filter(p => p.status !== "Completed" && new Date(p.timeline.endDate) < new Date()).length,
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        message.success("Status updated!");
        setData(prev => 
          prev.map(item => item._id === id ? { ...item, status: newStatus as any } : item)
        );
      } else {
        message.error("Failed to update status");
      }
    } catch (error) {
      message.error("Status update error");
    }
  };

  const getCustomFilterProps = (dataIndex: string): ColumnType<ProjectType> => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Search Company`}
          value={selectedKeys[0] as string}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<Search size={14} />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button
            onClick={() => {
              clearFilters && clearFilters();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <Search size={16} color={filtered ? '#0073ea' : undefined} />
    ),
    onFilter: (value, record) =>
      record.clientDetails.companyName.toLowerCase().includes((value as string).toLowerCase()),
  });

  const columns: ColumnsType<ProjectType> = [
    {
      title: "Company Name",
      dataIndex: ["clientDetails", "companyName"],
      key: "companyName",
      ...getCustomFilterProps("companyName"),
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "Email",
      dataIndex: ["clientDetails", "email"],
      key: "email",
    },
    {
      title: "Requested Features",
      key: "features",
      render: (_, record) => {
        const feats = record.features;
        const requested = Object.entries(feats)
          .filter(([_, value]) => value === true)
          .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim());

        if (requested.length === 0) return <Tag color="error">None</Tag>;
        return requested.map((feat, i) => (
          <Tag color="success" key={i} style={{ textTransform: "capitalize", marginBottom: 4 }}>
            {feat}
          </Tag>
        ));
      },
    },
    {
      title: "Timeline",
      key: "timeline",
      sorter: (a, b) => new Date(a.timeline.startDate).getTime() - new Date(b.timeline.startDate).getTime(),
      render: (_, record) => {
        if (!record.timeline?.startDate) return "N/A";
        const start = new Date(record.timeline.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const end = new Date(record.timeline.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return <Text>{`${start} — ${end}`}</Text>;
      },
    },
    {
      title: "Status",
      key: "status",
      dataIndex: "status",
      render: (status, record) => (
        <Select
          defaultValue={status}
          style={{ width: 120 }}
          variant="borderless"
          className="report-status-select"
          onChange={(val) => handleStatusChange(record._id, val)}
          options={[
            { value: "Pending", label: <Tag color="default">Pending</Tag> },
            { value: "Active", label: <Tag color="processing">Active</Tag> },
            { value: "Completed", label: <Tag color="success">Completed</Tag> },
          ]}
        />
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<Eye size={18} />} 
          onClick={() => {
            setSelectedReq(record);
            setDrawerVisible(true);
          }}
        >
          Report
        </Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Dashboard</Title>
        <Text type="secondary">Welcome back. Here is your overview.</Text>
      </div>

      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
              <Statistic 
                title="Completed" 
                value={stats.completed} 
                prefix={<CheckCircle size={20} color="#52c41a" style={{ marginRight: 8 }} />} 
                valueStyle={{ fontWeight: 600, color: "#52c41a" }} 
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
              <Statistic 
                title="Active" 
                value={stats.active} 
                prefix={<Activity size={20} color="#1890ff" style={{ marginRight: 8 }} />} 
                valueStyle={{ fontWeight: 600, color: "#1890ff" }} 
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
              <Statistic 
                title="Pending" 
                value={stats.pending} 
                prefix={<Clock size={20} color="#8c8c8c" style={{ marginRight: 8 }} />} 
                valueStyle={{ fontWeight: 600, color: "#8c8c8c" }} 
              />
            </Skeleton>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="borderless" style={{ borderRadius: 12 }}>
            <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
              <Statistic 
                title="Overdue" 
                value={stats.overdue} 
                prefix={<AlertCircle size={20} color="#ff4d4f" style={{ marginRight: 8 }} />} 
                valueStyle={{ fontWeight: 600, color: "#ff4d4f" }} 
              />
            </Skeleton>
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 12, padding: 0 }} styles={{ body: { padding: '0 24px 24px' } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0 16px' }}>
          <Title level={5} style={{ margin: 0 }}>Recent Client Projects</Title>
        </div>
        <Skeleton loading={loading} active paragraph={{ rows: 6 }}>
          <Table 
            columns={columns} 
            dataSource={data} 
            rowKey="_id" 
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1000 }}
          />
        </Skeleton>
      </Card>

      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 32 }}>
            <span>Project Report</span>
            <Button size="small" type="primary" onClick={() => window.print()}>Print</Button>
          </div>
        }
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        destroyOnClose
      >
        {selectedProject && (
          <div className="report-printable-area">
            <Typography.Title level={4}>{selectedProject.clientDetails.companyName}</Typography.Title>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Status: <Tag color={selectedProject.status === 'Completed' ? 'success' : selectedProject.status === 'Active' ? 'processing' : 'default'}>{selectedProject.status}</Tag>
            </Typography.Text>

            <Descriptions title="Client Summary" bordered column={1} style={{ marginBottom: 32 }}>
              <Descriptions.Item label="Contact Person">{selectedProject.clientDetails.contactPerson || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Email Address">{selectedProject.clientDetails.email}</Descriptions.Item>
              <Descriptions.Item label="Project Timeline">
                {selectedProject.timeline?.startDate ? `${new Date(selectedProject.timeline.startDate).toLocaleDateString()} to ${new Date(selectedProject.timeline.endDate).toLocaleDateString()}` : "N/A"}
              </Descriptions.Item>
              <Descriptions.Item label="Record Created">
                {new Date(selectedProject.createdAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Descriptions title="Feature Matrix" bordered column={1} style={{ marginBottom: 32 }}>
              <Descriptions.Item label="Dashboard">{selectedProject.features.dashboard ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Web Application">{selectedProject.features.webApp ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Android Mobile App">{selectedProject.features.androidApp ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>}</Descriptions.Item>
              <Descriptions.Item label="iOS Mobile App">{selectedProject.features.iosApp ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>}</Descriptions.Item>
              <Descriptions.Item label="Admin Panel">{selectedProject.features.adminPanel ? <Tag color="success">Yes</Tag> : <Tag color="error">No</Tag>}</Descriptions.Item>
            </Descriptions>

            <Descriptions title="Extra Add-ons & Notes" bordered column={1}>
              <Descriptions.Item label="Notes">
                <div style={{ whiteSpace: "pre-wrap", padding: 8 }}>
                  {selectedProject.extraAddOns || <Text type="secondary">No additional notes provided.</Text>}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Drawer>
    </>
  );
}
