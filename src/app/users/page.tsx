"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Typography,
  Table,
  Tag,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  App,
  ConfigProvider,
  Space,
  Popconfirm,
  Tooltip,
  Badge,
  Result,
  Grid,
} from "antd";
import { Role } from "@/lib/constants";


import {
  Plus,
  RefreshCcw,
  Edit2,
  Trash2,
  UserPlus,
  Search,
  Settings,
  ShieldCheck,
  Briefcase,
  Phone,
  MapPin
} from "lucide-react";
import type { TableProps } from "antd";

type ColumnsType<T> = TableProps<T>["columns"];

const { Title, Text } = Typography;
const { Option } = Select;



interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phoneNumber?: string;
  location?: string;
  faceReferenceImage?: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<{ role: Role } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const screens = Grid.useBreakpoint();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const isMobile = mounted && !screens.md;


  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      } else {
        message.error(data.error || "Failed to fetch users");
      }
    } catch (error) {
      message.error("An error occurred while fetching users");
    } finally {
      setLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch("/api/user/me");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        if (data.user.role === Role.ADMIN) {
          fetchUsers();
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [fetchUsers]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);


  const showModal = (user?: UserRecord) => {
    if (user) {
      setEditingUser(user);
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber || "",
        location: user.location || "",
        password: "", // Don't show password, only allow change if needed
      });
    } else {
      setEditingUser(null);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PATCH" : "POST";

      // Remove empty password on edit
      if (editingUser && !values.password) {
        delete values.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(`User ${editingUser ? "updated" : "created"} successfully`);
        setIsModalVisible(false);
        form.resetFields();
        fetchUsers();
      } else {
        message.error(data.error || `Failed to ${editingUser ? "update" : "create"} user`);
      }
    } catch (error) {
      message.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        message.success("User deleted successfully");
        fetchUsers();
      } else {
        message.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      message.error("An error occurred while deleting user");
    }
  };

  const columns: ColumnsType<UserRecord> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text, record) => (
        <Space
          onClick={() => showModal(record)}
          style={{ cursor: "pointer" }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: '#00897b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 12,
            color: "white"
          }}>
            {text.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 600, color: "#0073ea" }}>{text}</span>
        </Space>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email) => <span style={{ color: "#676879" }}>{email}</span>,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role) => {
        const isAdmin = role === Role.ADMIN;
        return (
          <Tag
            icon={isAdmin ? <ShieldCheck size={12} style={{ marginRight: 4 }} /> : <Briefcase size={12} style={{ marginRight: 4 }} />}
            color={isAdmin ? "blue" : "default"}
            style={{
              borderRadius: 4,
              padding: '2px 8px',
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            {role === Role.SALES ? "SALES" : role}

          </Tag>
        );
      },
    },
    {
      title: "Phone Number",
      dataIndex: "phoneNumber",
      key: "phoneNumber",
      render: (phone) => <span style={{ color: "#676879" }}>{phone || "N/A"}</span>,
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      render: (loc) => <span style={{ color: "#676879" }}>{loc || "N/A"}</span>,
    },
    {
      title: "Face Status",
      key: "faceStatus",
      render: (_, record) => (
        <Badge
          status={record.faceReferenceImage ? "success" : "default"}
          text={record.faceReferenceImage ? "Registered" : "Not Registered"}
        />
      ),
    },
    {
      title: "Created At",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => <span style={{ color: "#676879" }}>{new Date(date).toLocaleDateString()}</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => {
        const shouldForceClose = isModalVisible || (typeof window !== "undefined" && navigator.maxTouchPoints > 0);

        const safeClick = (cb: () => void) => {
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          document.body.click();
          cb();
        };

        return (
          <Space size="middle">
            <Tooltip title="Edit User" trigger="hover" open={shouldForceClose ? false : undefined} destroyOnHidden>
              <Button
                type="text"
                icon={<Edit2 size={16} />}
                onClick={() => safeClick(() => showModal(record))}
                style={{ color: "#0073ea" }}
              />
            </Tooltip>
            <Tooltip title="Delete User" trigger="hover" open={shouldForceClose ? false : undefined} destroyOnHidden>
              <Popconfirm
                title="Delete the user"
                description="Are you sure to delete this user?"
                onConfirm={() => safeClick(() => handleDelete(record._id))}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  danger
                  icon={<Trash2 size={16} />}
                  onClick={() => safeClick(() => { })}
                />
              </Popconfirm>
            </Tooltip>
          </Space>
        );
      },
    },
  ];

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCheckingAuth) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>Loading permissions...</div>;
  }

  if (!currentUser || currentUser.role !== Role.ADMIN) {
    return (
      <Result
        status="403"
        title="403"
        subTitle="Sorry, you are not authorized to access this page."
        extra={
          <Button type="primary" onClick={() => (window.location.href = "/dashboard")}>
            Back Home
          </Button>
        }
      />
    );
  }

  return (
    <div style={{
      padding: "0",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      minWidth: 0,
      maxWidth: "100%"
    }}>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: 16
      }}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Users Management</Title>
          <Text type="secondary" style={{ fontSize: 14 }}>Manage your team members and their permissions.</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto' }}>
          <Button
            icon={<RefreshCcw size={16} className={loading ? "animate-spin" : ""} />}
            onClick={fetchUsers}
            disabled={loading}
            style={{ flex: isMobile ? 1 : 'unset', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<UserPlus size={16} />}
            onClick={() => showModal()}
            style={{
              flex: isMobile ? 1 : 'unset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              backgroundColor: '#0073ea',
              boxShadow: '0 4px 6px rgba(0, 115, 234, 0.2)'
            }}
          >
            Add New User
          </Button>
        </div>
      </div>

      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
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
        <div style={{ padding: '16px 0px', borderBottom: '1px solid #f0f0f0', display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f5f6f8',
            padding: '6px 12px',
            borderRadius: 6,
            flex: 1,
            maxWidth: 400
          }}>
            <Search size={16} color="#676879" />
            <input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                marginLeft: 8,
                width: '100%',
                color: '#323338'
              }}
            />
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text type="secondary">Total Users: <Badge count={filteredUsers.length} overflowCount={999} style={{ backgroundColor: '#0073ea' }} /></Text>
          </div>
        </div>

        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="_id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            style: { paddingRight: 24 }
          }}
          scroll={{ x: 'max-content', y: 'calc(100vh - 380px)' }}
        />
      </Card>

      <Modal
        title={
          <Space style={{ marginBottom: 16 }}>
            {editingUser ? <Settings size={20} color="#0073ea" /> : <UserPlus size={20} color="#0073ea" />}
            <span style={{ fontSize: 18, fontWeight: 600 }}>{editingUser ? "Edit User Details" : "Create New User"}</span>
          </Space>
        }
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnHidden
        forceRender
        width={480}
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ role: Role.SALES }}
          style={{ marginTop: 8 }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please input the name!" }]}
          >
            <Input placeholder="Enter full name" prefix={<Briefcase size={14} color="#676879" style={{ marginRight: 4 }} />} />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: "Please input the email!" },
              { type: "email", message: "Please enter a valid email!" }
            ]}
          >
            <Input placeholder="email@example.com" prefix={<Search size={14} color="#676879" style={{ marginRight: 4 }} />} />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
            rules={editingUser ? [] : [{ required: true, message: "Please input the password!" }]}
          >
            <Input.Password placeholder="Set a secure password" />
          </Form.Item>

          <Form.Item
            name="role"
            label="User Role"
            rules={[{ required: true, message: "Please select a role!" }]}
          >
            <Select placeholder="Select a role">
              <Option value={Role.ADMIN}>Admin (Full Access)</Option>
              <Option value={Role.SALES}>Sales</Option>
            </Select>
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="phoneNumber"
                label="Phone Number"
                rules={[
                  { required: true, message: "Please input the phone number!" },
                  { pattern: /^[0-9]+$/, message: "Phone number must contain only digits!" }
                ]}
              >
                <Input placeholder="Enter phone number (digits only)" prefix={<Phone size={14} color="#676879" style={{ marginRight: 4 }} />} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="location"
                label="Location (auto-filled during face registration)"
              >
                <Input placeholder="Captured when the user registers face" prefix={<MapPin size={14} color="#676879" style={{ marginRight: 4 }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={loading} style={{ backgroundColor: '#0073ea' }}>
                {editingUser ? "Update User" : "Create User"}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
