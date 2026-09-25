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
  Space,
  Popconfirm,
  Tooltip,
  Badge,
  Result,
  Row,
  Col,
  Statistic,
  Divider,
  Segmented,
} from "antd";
import { useRouter } from "next/navigation";
import { Role, UserStatus } from "@/lib/constants";
import {
  UserPlus,
  RefreshCcw,
  Edit2,
  Trash2,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  Plus,
  Key,
  Mail,
} from "lucide-react";
import EmailSettingsPanel from "@/components/admin/EmailSettingsPanel";
import type { TableProps } from "antd";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface EmployeeRecord {
  _id: string;
  name: string;
  username?: string;
  email: string;
  microsoftEmail?: string;
  designation?: string;
  role: string;
  status: UserStatus | string;
  phoneNumber?: string;
  location?: string;
  createdAt: string;
  updatedAt?: string;
}

interface RoleRecord {
  _id: string;
  name: string;
  label?: string;
  description?: string;
  isSystem: boolean;
}

export default function SystemAdminPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<"employees" | "email">("employees");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [inlineRoleName, setInlineRoleName] = useState("");
  const [creatingRoleLoading, setCreatingRoleLoading] = useState(false);

  const [form] = Form.useForm();
  const [roleForm] = Form.useForm();
  const { message } = App.useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState<{
    role: string;
    email: string;
    username?: string;
  } | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const router = useRouter();

  // Fetch current user and verify SYSTEM_ADMIN role
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        if (data.user?.role !== Role.SYSTEM_ADMIN) {
          console.warn("[Admin Page] User is not SYSTEM_ADMIN:", data.user?.role);
        }
      } else {
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setIsCheckingAuth(false);
    }
  }, [router]);

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (res.ok) {
        setEmployees(Array.isArray(data) ? data : []);
      } else {
        message.error(data.error || "Failed to fetch employees");
      }
    } catch (_err) {
      message.error("Network error while fetching employees");
    } finally {
      setLoading(false);
    }
  }, [message]);

  // Fetch available roles
  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const data = await res.json();
        setRoles(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (currentUser?.role === Role.SYSTEM_ADMIN) {
      fetchEmployees();
      fetchRoles();
    }
  }, [currentUser, fetchEmployees, fetchRoles]);

  // Create new role handler
  const handleCreateRole = async (values: {
    name: string;
    label?: string;
    description?: string;
  }) => {
    setCreatingRoleLoading(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (res.ok) {
        message.success(`Role '${data.name}' created successfully!`);
        await fetchRoles();
        roleForm.resetFields();
        return data;
      } else {
        message.error(data.error || "Failed to create role");
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || "Error creating role");
    } finally {
      setCreatingRoleLoading(false);
    }
    return null;
  };

  // Inline role creation directly inside employee select dropdown
  const handleCreateInlineRole = async (
    e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>
  ) => {
    e.preventDefault();
    if (!inlineRoleName.trim()) {
      message.warning("Please enter a role name");
      return;
    }
    const created = await handleCreateRole({ name: inlineRoleName.trim() });
    if (created) {
      form.setFieldValue("role", created.name);
      setInlineRoleName("");
    }
  };

  // Delete role handler
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        message.success(data.message || `Role '${roleName}' removed.`);
        fetchRoles();
      } else {
        message.error(data.error || "Failed to delete role");
      }
    } catch (_err) {
      message.error("Error deleting role");
    }
  };

  // Open Add / Edit Modal
  const openModal = (emp?: EmployeeRecord) => {
    if (emp) {
      setEditingEmployee(emp);
      form.setFieldsValue({
        name: emp.name,
        username: emp.username || "",
        email: emp.email,
        password: "",
        designation: emp.designation || "",
        role: emp.role,
        status: emp.status || UserStatus.ACTIVE,
      });
    } else {
      setEditingEmployee(null);
      form.resetFields();
      form.setFieldsValue({
        status: UserStatus.ACTIVE,
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    form.resetFields();
    setInlineRoleName("");
  };

  // Submit Add or Edit Employee
  const handleFormSubmit = async (values: Record<string, unknown>) => {
    try {
      if (editingEmployee) {
        // Clean out blank password on edit
        const payload = { ...values };
        if (!payload.password || payload.password.trim() === "") {
          delete payload.password;
        }

        const res = await fetch(`/api/users/${editingEmployee._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok) {
          message.success(`Employee ${data.name} updated successfully!`);
          closeModal();
          fetchEmployees();
        } else {
          message.error(data.error || "Failed to update employee");
        }
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        const data = await res.json();

        if (res.ok) {
          message.success(`Employee ${data.name} registered successfully!`);
          closeModal();
          fetchEmployees();
        } else {
          message.error(data.error || "Failed to register employee");
        }
      }
    } catch (_err) {
      message.error("An unexpected error occurred. Please try again.");
    }
  };

  // Toggle user status (Activate / Deactivate)
  const toggleStatus = async (record: EmployeeRecord) => {
    const isCurrentlyActive = record.status !== UserStatus.INACTIVE;
    const newStatus = isCurrentlyActive ? UserStatus.INACTIVE : UserStatus.ACTIVE;

    try {
      const res = await fetch(`/api/users/${record._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(
          `${record.name} has been ${isCurrentlyActive ? "deactivated" : "activated"}.`
        );
        fetchEmployees();
      } else {
        message.error(data.error || "Status update failed");
      }
    } catch (_err) {
      message.error("Network error while updating status");
    }
  };

  // Delete employee handler
  const handleDelete = async (userId: string, userName: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        message.success(`${userName} was removed successfully.`);
        fetchEmployees();
      } else {
        message.error(data.error || "Failed to remove employee");
      }
    } catch (_err) {
      message.error("Error deleting employee");
    }
  };

  // Filtered list based on search
  const filteredEmployees = employees.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(q) ||
      emp.username?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q) ||
      emp.role?.toLowerCase().includes(q)
    );
  });

  // Calculate statistics
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status !== UserStatus.INACTIVE).length;

  if (isCheckingAuth) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Text type="secondary">Verifying System Admin permissions...</Text>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== Role.SYSTEM_ADMIN) {
    return (
      <div style={{ padding: "40px 20px", display: "flex", justifyContent: "center" }}>
        <Card style={{ maxWidth: 500, textAlign: "center", borderRadius: 12 }}>
          <Result
            status="403"
            title="Access Restricted: System Admin Only"
            subTitle="Only the dedicated System Administrator has access to this management dashboard."
            extra={
              <Button type="primary" onClick={() => router.push("/dashboard")}>
                Back to Employee Dashboard
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const columns: TableProps<EmployeeRecord>["columns"] = [
    {
      title: "Employee Name",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: EmployeeRecord) => (
        <Space orientation="vertical" size={2}>
          <Text strong style={{ fontSize: 14 }}>
            {text}
          </Text>
          {record.role === Role.SYSTEM_ADMIN && (
            <Tag
              color="purple"
              icon={<ShieldCheck size={12} style={{ verticalAlign: -1, marginRight: 3 }} />}
            >
              System Admin
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      render: (username: string) => (
        <Tag color="geekblue" style={{ fontFamily: "monospace", fontSize: 13 }}>
          {username || "admin"}
        </Tag>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      render: (email: string) => (
        <span style={{ fontFamily: "monospace", color: "#434343" }}>{email}</span>
      ),
    },
    {
      title: "Company Designation",
      dataIndex: "designation",
      key: "designation",
      render: (desig: string) => desig || <Text type="secondary">—</Text>,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      render: (role: string) => {
        let color = "blue";
        if (role === Role.SYSTEM_ADMIN) color = "purple";
        else if (role.startsWith("TECH")) color = "orange";
        else if (role.startsWith("SALES")) color = "green";
        else color = "cyan";
        return <Tag color={color}>{role}</Tag>;
      },
    },
    {
      title: "Access Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const isActive = status !== UserStatus.INACTIVE;
        return (
          <Badge
            status={isActive ? "success" : "error"}
            text={
              <Tag color={isActive ? "green" : "red"} style={{ fontWeight: 600 }}>
                {isActive ? "ACTIVE" : "INACTIVE"}
              </Tag>
            }
          />
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_text: unknown, record: EmployeeRecord) => {
        const isActive = record.status !== UserStatus.INACTIVE;
        const isSelf =
          record.email === currentUser?.email ||
          (record.username && record.username === currentUser?.username);

        return (
          <Space size="middle">
            <Tooltip title="Edit details, role, or reset password">
              <Button
                type="text"
                icon={<Edit2 size={16} />}
                onClick={() => openModal(record)}
                style={{ color: "#1890ff" }}
              />
            </Tooltip>

            {isSelf ? (
              <Tooltip title="Cannot deactivate your own active System Admin session">
                <Button type="text" disabled style={{ color: "#d9d9d9" }}>
                  Active
                </Button>
              </Tooltip>
            ) : (
              <Popconfirm
                title={`${isActive ? "Deactivate" : "Activate"} Employee`}
                description={`Are you sure you want to ${isActive ? "deactivate" : "activate"} ${record.name}? ${
                  isActive
                    ? "They will be denied login access immediately."
                    : "They will be able to log in."
                }`}
                onConfirm={() => toggleStatus(record)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  danger={isActive}
                  style={{ color: isActive ? "#ff4d4f" : "#52c41a", fontWeight: 500 }}
                >
                  {isActive ? "Deactivate" : "Activate"}
                </Button>
              </Popconfirm>
            )}

            {!isSelf && (
              <Popconfirm
                title="Remove Employee"
                description={`Are you sure you want to remove ${record.name}? Their login credentials will be revoked.`}
                onConfirm={() => handleDelete(record._id, record.name)}
                okText="Remove"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Remove employee">
                  <Button type="text" danger icon={<Trash2 size={16} />} />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: "8px 0" }}>
      {/* Header Title Section */}
      <div style={{ marginBottom: 18 }}>
        <Title
          level={3}
          style={{ margin: "0 0 4px 0", display: "flex", alignItems: "center", gap: 10 }}
        >
          <ShieldCheck size={26} color="#00897b" />
          User Management
        </Title>
        <Text type="secondary">
          Manage authorized employees, set login credentials, customize roles, and configure
          automated email notifications.
        </Text>
      </div>

      {/* Navigation Segmented Bar */}
      <div style={{ marginBottom: 24 }}>
        <Segmented
          size="large"
          value={adminTab}
          onChange={(val) => setAdminTab(val as "employees" | "email")}
          options={[
            {
              label: (
                <Space style={{ padding: "4px 14px", fontWeight: 600 }}>
                  <Users size={16} />
                  <span>Employee & Access Management</span>
                </Space>
              ),
              value: "employees",
            },
            {
              label: (
                <Space style={{ padding: "4px 14px", fontWeight: 600 }}>
                  <Mail size={16} />
                  <span>Email & Automated Notifications</span>
                </Space>
              ),
              value: "email",
            },
          ]}
        />
      </div>

      {adminTab === "email" ? (
        <EmailSettingsPanel />
      ) : (
        <>
          {/* Statistics Cards */}
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={12} sm={8}>
              <Card
                variant="borderless"
                style={{ borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <Statistic
                  title={
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Total Employees
                    </Text>
                  }
                  value={totalCount}
                  prefix={<Users size={18} style={{ marginRight: 6, color: "#1890ff" }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card
                variant="borderless"
                style={{ borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <Statistic
                  title={
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Active Accounts
                    </Text>
                  }
                  value={activeCount}
                  styles={{ content: { color: "#52c41a" } }}
                  prefix={<UserCheck size={18} style={{ marginRight: 6, color: "#52c41a" }} />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8}>
              <Card
                variant="borderless"
                style={{ borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
              >
                <Statistic
                  title={
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Configured Roles
                    </Text>
                  }
                  value={roles.length}
                  styles={{ content: { color: "#722ed1" } }}
                  prefix={<ShieldCheck size={18} style={{ marginRight: 6, color: "#722ed1" }} />}
                />
              </Card>
            </Col>
          </Row>

          {/* Employee Management Card */}
          <Card
            variant="borderless"
            style={{
              borderRadius: 12,
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}
          >
            {/* Action Bar */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Employee Management
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Employees authenticate using the username and password configured below.
                </Text>
              </div>

              <Space wrap>
                <Input
                  placeholder="Search by name, username, email, role..."
                  prefix={<Search size={16} style={{ color: "rgba(0,0,0,0.4)" }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  style={{ width: 280, borderRadius: 8 }}
                />

                <Button
                  icon={<RefreshCcw size={15} />}
                  onClick={() => {
                    fetchEmployees();
                    fetchRoles();
                  }}
                  loading={loading}
                  style={{ borderRadius: 8 }}
                >
                  Refresh
                </Button>

                <Button
                  icon={<ShieldCheck size={15} />}
                  onClick={() => setIsRoleModalOpen(true)}
                  style={{ borderRadius: 8 }}
                >
                  Manage Roles
                </Button>

                <Button
                  type="primary"
                  icon={<UserPlus size={15} />}
                  onClick={() => openModal()}
                  style={{
                    borderRadius: 8,
                    backgroundColor: "#00897b",
                    borderColor: "#00897b",
                  }}
                >
                  Add Employee
                </Button>
              </Space>
            </div>

            {/* Employee Table */}
            <Table
              columns={columns}
              dataSource={filteredEmployees}
              rowKey="_id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} employees`,
                showSizeChanger: true,
              }}
              locale={{
                emptyText: searchQuery
                  ? "No employees match your search query."
                  : "No employees registered yet. Click 'Add Employee' to register one.",
              }}
            />
          </Card>
        </>
      )}

      {/* Add / Edit Employee Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <UserPlus size={20} color="#00897b" />
            <Text strong style={{ fontSize: 16 }}>
              {editingEmployee ? "Edit Employee Profile & Credentials" : "Add New Employee"}
            </Text>
          </div>
        }
        open={isModalOpen}
        onCancel={closeModal}
        footer={[
          <Button key="cancel" onClick={closeModal}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            onClick={() => form.submit()}
            style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
          >
            {editingEmployee ? "Save Changes" : "Register Employee"}
          </Button>,
        ]}
        forceRender
        destroyOnHidden
        width={560}
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
          {editingEmployee
            ? "Update company role, designation, status, or reset login password."
            : "Set employee details, username, and password. The employee will sign in using these credentials."}
        </Paragraph>

        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter the employee's full name" }]}
          >
            <Input placeholder="e.g. Rahul Sharma" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Username"
                rules={[{ required: true, message: "Please enter a username" }]}
                extra="Used by employee to log in"
              >
                <Input placeholder="e.g. rahul_s" style={{ borderRadius: 6 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="password"
                label={editingEmployee ? "Reset Password" : "Password"}
                rules={[{ required: !editingEmployee, message: "Please enter a password" }]}
                extra={
                  editingEmployee
                    ? "Leave blank to keep existing password"
                    : "Set initial login password"
                }
              >
                <Input.Password
                  placeholder={editingEmployee ? "Leave blank to keep current" : "••••••••"}
                  style={{ borderRadius: 6 }}
                  prefix={<Key size={14} color="#8c8c8c" />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Company Email"
            rules={[
              { required: true, message: "Please enter the email address" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input placeholder="e.g. rahul.sharma@company.com" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Form.Item
            name="designation"
            label="Company Designation"
            rules={[{ required: false }]}
            extra="Descriptive position, e.g. Senior Software Engineer, Project Manager, QA Analyst."
          >
            <Input placeholder="e.g. Software Engineer" style={{ borderRadius: 6 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={14}>
              <Form.Item
                name="role"
                label="Application Role"
                rules={[{ required: true, message: "Please select or create an application role" }]}
                extra="Select an existing role or type a new custom role below."
              >
                <Select
                  showSearch
                  placeholder="Select or create a role..."
                  style={{ borderRadius: 6 }}
                  popupMatchSelectWidth={false}
                  popupRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: "8px 0" }} />
                      <div style={{ padding: "4px 12px 8px" }}>
                        <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                          + Create Custom Role
                        </Text>
                        <Space.Compact style={{ width: "100%" }}>
                          <Input
                            placeholder="e.g. DEVELOPER, QA_LEAD"
                            size="small"
                            value={inlineRoleName}
                            onChange={(e) => setInlineRoleName(e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                            onPressEnter={handleCreateInlineRole}
                          />
                          <Button
                            type="primary"
                            size="small"
                            loading={creatingRoleLoading}
                            onClick={handleCreateInlineRole}
                            style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
                          >
                            Add
                          </Button>
                        </Space.Compact>
                      </div>
                    </>
                  )}
                >
                  {roles.map((r) => (
                    <Option key={r._id || r.name} value={r.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span>
                          {r.label && r.label !== r.name ? `${r.label} (${r.name})` : r.name}
                        </span>
                        {r.isSystem ? (
                          <Tag
                            color="purple"
                            style={{ fontSize: 10, lineHeight: "16px", margin: 0 }}
                          >
                            Default
                          </Tag>
                        ) : (
                          <Tag color="blue" style={{ fontSize: 10, lineHeight: "16px", margin: 0 }}>
                            Custom
                          </Tag>
                        )}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col span={10}>
              <Form.Item
                name="status"
                label="Access Status"
                rules={[{ required: true, message: "Please select status" }]}
                extra="INACTIVE prevents login."
              >
                <Select style={{ borderRadius: 6 }}>
                  <Option value={UserStatus.ACTIVE}>
                    <Tag color="green">ACTIVE</Tag>
                  </Option>
                  <Option value={UserStatus.INACTIVE}>
                    <Tag color="red">INACTIVE</Tag>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Manage Roles Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={20} color="#00897b" />
            <Text strong style={{ fontSize: 16 }}>
              Manage Application Roles
            </Text>
          </div>
        }
        open={isRoleModalOpen}
        onCancel={() => setIsRoleModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsRoleModalOpen(false)}>
            Close
          </Button>,
        ]}
        width={640}
        forceRender
        destroyOnHidden
      >
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
          Define custom roles for your organization. Only SYSTEM_ADMIN is default; all other roles
          are created and managed by you.
        </Paragraph>

        <Card
          size="small"
          style={{ marginBottom: 16, backgroundColor: "#fafafa", borderRadius: 8 }}
          title={
            <Text strong style={{ fontSize: 13 }}>
              Create New Role
            </Text>
          }
        >
          <Form form={roleForm} layout="vertical" onFinish={handleCreateRole}>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="Role Code"
                  rules={[{ required: true, message: "Enter role identifier (e.g. HR, QA_LEAD)" }]}
                  extra="Upper-case identifier"
                >
                  <Input placeholder="e.g. HR, QA_LEAD" style={{ borderRadius: 6 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="label" label="Display Label" extra="Human-readable title">
                  <Input placeholder="e.g. Human Resources" style={{ borderRadius: 6 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label="Description" style={{ marginBottom: 12 }}>
              <Input.TextArea
                rows={2}
                placeholder="Optional notes or responsibility summary..."
                style={{ borderRadius: 6 }}
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<Plus size={14} />}
              loading={creatingRoleLoading}
              style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
            >
              Create Role
            </Button>
          </Form>
        </Card>

        <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
          Configured Roles ({roles.length})
        </Text>
        <div
          style={{
            borderRadius: 8,
            maxHeight: 280,
            overflowY: "auto",
            border: "1px solid #f0f0f0",
          }}
        >
          {roles.map((r, index) => (
            <div
              key={r._id || r.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 16px",
                borderBottom: index < roles.length - 1 ? "1px solid #f0f0f0" : "none",
              }}
            >
              <div>
                <Space>
                  <Text strong>{r.name}</Text>
                  {r.label && r.label !== r.name && <Text type="secondary">({r.label})</Text>}
                </Space>
                <div style={{ color: "rgba(0, 0, 0, 0.45)", fontSize: 13, marginTop: 4 }}>
                  {r.description || "No description provided."}
                </div>
              </div>
              <div>
                {r.isSystem ? (
                  <Tag color="purple">Default Core</Tag>
                ) : (
                  <Popconfirm
                    title="Delete Role"
                    description={`Are you sure you want to delete '${r.name}'?`}
                    onConfirm={() => handleDeleteRole(r._id, r.name)}
                    okText="Delete"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <Button danger size="small" type="text" icon={<Trash2 size={14} />}>
                      Delete
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
