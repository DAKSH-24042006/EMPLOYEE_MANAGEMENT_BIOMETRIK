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
  message, 
  ConfigProvider, 
  Space, 
  Popconfirm,
  Tooltip,
  Badge
} from "antd";
import { 
  Plus, 
  RefreshCcw, 
  Edit2, 
  Trash2, 
  UserPlus, 
  Search,
  Settings,
  ShieldCheck,
  Briefcase
} from "lucide-react";
import type { TableProps } from "antd";

type ColumnsType<T> = TableProps<T>["columns"];

const { Title, Text } = Typography;
const { Option } = Select;

enum Role {
  ADMIN = "ADMIN",
  SALES_TEAM = "SALES_TEAM",
}

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form] = Form.useForm();
  const [searchQuery, setSearchQuery] = useState("");

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

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showModal = (user?: UserRecord) => {
    if (user) {
      setEditingUser(user);
      form.setFieldsValue({
        name: user.name,
        email: user.email,
        role: user.role,
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
      render: (text) => (
        <Space>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: '50%', 
            backgroundColor: '#ffcd00', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 12,
            color: '#333'
          }}>
            {text.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontWeight: 500, color: "#323338" }}>{text}</span>
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
            {role.replace("_", " ")}
          </Tag>
        );
      },
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
      fixed: 'right',
      width: 120,
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="Edit User">
            <Button 
              type="text" 
              icon={<Edit2 size={16} />} 
              onClick={() => showModal(record)}
              style={{ color: "#0073ea" }}
            />
          </Tooltip>
          <Tooltip title="Delete User">
            <Popconfirm
              title="Delete the user"
              description="Are you sure to delete this user?"
              onConfirm={() => handleDelete(record._id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button 
                type="text" 
                danger 
                icon={<Trash2 size={16} />} 
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
      <div style={{ padding: "8px 0" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-end",
          marginBottom: 24 
        }}>
          <div>
            <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 600 }}>Users Management</Title>
            <Text type="secondary" style={{ fontSize: 14 }}>Manage your team members and their permissions.</Text>
          </div>
          <Space>
            <Button 
              icon={<RefreshCcw size={16} className={loading ? "animate-spin" : ""} />} 
              onClick={fetchUsers}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              Refresh
            </Button>
            <Button 
              type="primary" 
              icon={<UserPlus size={16} />} 
              onClick={() => showModal()}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                backgroundColor: '#0073ea',
                boxShadow: '0 4px 6px rgba(0, 115, 234, 0.2)'
              }}
            >
              Add New User
            </Button>
          </Space>
        </div>

        <Card 
          variant="borderless" 
          style={{ 
            borderRadius: 12, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: 24
          }}
          styles={{ body: { padding: 0 } }}
        >
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: 16 }}>
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
            scroll={{ x: 800 }}
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
            initialValues={{ role: Role.SALES_TEAM }}
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
                <Option value={Role.SALES_TEAM}>Sales Team</Option>
              </Select>
            </Form.Item>

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
