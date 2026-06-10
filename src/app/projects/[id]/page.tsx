"use client";

import React, { use, useEffect, useState, useRef } from "react";
import {
  Typography,
  Card,
  Tabs,
  Tag,
  Button,
  Row,
  Col,
  Space,
  Select,
  Modal,
  Form,
  Input,
  Checkbox,
  DatePicker,
  Table,
  List,
  Avatar,
  Upload,
  Timeline,
  Divider,
  message,
  Popconfirm,
  Badge,
} from "antd";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  MessageSquare,
  AlertTriangle,
  Paperclip,
  History,
  Info,
  CheckCircle,
  Plus,
  Trash2,
  Download,
  AlertOctagon,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ----------------------------------------------------
// Project Details Client Sub-Component
// ----------------------------------------------------
function ProjectDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<any>(null);
  
  // Tabs data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);

  // Forms
  const [editForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [blockerForm] = Form.useForm();
  const [resolveForm] = Form.useForm();

  // Chat message & mentions state
  const [chatInput, setChatInput] = useState("");
  const [chatMentions, setChatMentions] = useState<string[]>([]);
  const [chatUploading, setChatUploading] = useState(false);
  const [chatFile, setChatFile] = useState<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    fetchProject();
    fetchUsers();
    fetchTasks();
    fetchChat();
    fetchBlockers();
    fetchAttachments();
    fetchVersions();
  }, [id]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Fetch functions
  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const json = await res.json();
      if (res.ok) {
        setProject(json.data);
        editForm.setFieldsValue({
          title: json.data.title,
          companyName: json.data.clientDetails.companyName,
          contactPerson: json.data.clientDetails.contactPerson,
          email: json.data.clientDetails.email,
          dashboard: json.data.features.dashboard,
          webApp: json.data.features.webApp,
          androidApp: json.data.features.androidApp,
          iosApp: json.data.features.iosApp,
          adminPanel: json.data.features.adminPanel,
          extraAddOns: json.data.extraAddOns,
          useCase: json.data.useCase,
          targetUsers: json.data.targetUsers,
          functionalRequirements: json.data.functionalRequirements,
          nonFunctionalRequirements: json.data.nonFunctionalRequirements,
          budget: json.data.budget,
          integrations: json.data.integrations,
          priority: json.data.priority,
          status: json.data.status,
          timeline: [dayjs(json.data.timeline.startDate), dayjs(json.data.timeline.endDate)],
        });
      } else {
        message.error("Failed to fetch project");
      }
    } catch (err) {
      message.error("Error loading project");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/tasks`);
      const json = await res.json();
      if (res.ok) setTasks(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/chat`);
      const json = await res.json();
      if (res.ok) setChatMessages(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlockers = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/blockers`);
      const json = await res.json();
      if (res.ok) setBlockers(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/attachments`);
      const json = await res.json();
      if (res.ok) setAttachments(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/versions`);
      const json = await res.json();
      if (res.ok) setVersions(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Operations
  const handleUpdateProject = async (values: any) => {
    try {
      const payload = {
        title: values.title,
        clientDetails: {
          companyName: values.companyName,
          contactPerson: values.contactPerson,
          email: values.email,
        },
        features: {
          dashboard: values.dashboard,
          webApp: values.webApp,
          androidApp: values.androidApp,
          iosApp: values.iosApp,
          adminPanel: values.adminPanel,
        },
        extraAddOns: values.extraAddOns,
        useCase: values.useCase,
        targetUsers: values.targetUsers,
        functionalRequirements: values.functionalRequirements,
        nonFunctionalRequirements: values.nonFunctionalRequirements,
        budget: values.budget,
        integrations: values.integrations,
        priority: values.priority,
        status: values.status,
        timeline: values.timeline ? [values.timeline[0].toISOString(), values.timeline[1].toISOString()] : undefined,
        changeReason: values.changeReason || "Update details",
      };

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("Project updated successfully!");
        setIsEditModalOpen(false);
        fetchProject();
        fetchVersions();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update project");
      }
    } catch (err) {
      message.error("Failed to update project");
    }
  };

  const handleCreateTask = async (values: any) => {
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          dueDate: values.dueDate.toISOString(),
          assignedTo: values.assignedTo,
          syncToGoogleCalendar: !!values.syncToGoogleCalendar,
        }),
      });

      if (res.ok) {
        message.success("Task created and synced!");
        setIsTaskModalOpen(false);
        taskForm.resetFields();
        fetchTasks();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to create task");
      }
    } catch (err) {
      message.error("Error creating task");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        message.success(`Task marked as ${newStatus}`);
        fetchTasks();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update task");
      }
    } catch (err) {
      message.error("Error updating task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        message.success("Task deleted");
        fetchTasks();
      }
    } catch (err) {
      message.error("Error deleting task");
    }
  };

  const handleCreateBlocker = async (values: any) => {
    try {
      const res = await fetch(`/api/projects/${id}/blockers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          type: values.type,
          priority: values.priority,
          ownerId: values.ownerId,
          dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        }),
      });

      if (res.ok) {
        message.success("Blocker/Dependency added!");
        setIsBlockerModalOpen(false);
        blockerForm.resetFields();
        fetchBlockers();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to raise blocker");
      }
    } catch (err) {
      message.error("Error raising blocker");
    }
  };

  const handleResolveBlocker = async (values: any) => {
    try {
      const res = await fetch(`/api/projects/${id}/blockers/${selectedBlocker._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Resolved",
          resolutionNote: values.resolutionNote,
        }),
      });

      if (res.ok) {
        message.success("Blocker marked as Resolved");
        setIsResolveModalOpen(false);
        resolveForm.resetFields();
        fetchBlockers();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to resolve blocker");
      }
    } catch (err) {
      message.error("Error resolving blocker");
    }
  };

  const handlePostChatMessage = async () => {
    if (!chatInput.trim() && !chatFile) return;

    try {
      let attachmentsPayload = [];
      if (chatFile) {
        // Upload the file first
        setChatUploading(true);
        const formData = new FormData();
        formData.append("file", chatFile);

        const uploadRes = await fetch(`/api/projects/${id}/attachments`, {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          message.error(uploadJson.error || "Failed to upload file attachment");
          setChatUploading(false);
          return;
        }

        attachmentsPayload.push({
          name: uploadJson.data.originalName,
          path: `/api/projects/${id}/attachments/${uploadJson.data._id}`,
          mimeType: uploadJson.data.mimeType,
          size: uploadJson.data.size,
        });
        
        // Also add file to project attachments list
        fetchAttachments();
      }

      const res = await fetch(`/api/projects/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          mentions: chatMentions,
          attachments: attachmentsPayload,
        }),
      });

      if (res.ok) {
        setChatInput("");
        setChatMentions([]);
        setChatFile(null);
        fetchChat();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to post message");
      }
    } catch (err) {
      message.error("Failed to post message");
    } finally {
      setChatUploading(false);
    }
  };

  const handleAttachmentUpload = async ({ file }: any) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/projects/${id}/attachments`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        message.success("File uploaded successfully");
        fetchAttachments();
      } else {
        message.error(json.error || "Upload failed");
      }
    } catch (err) {
      message.error("File upload failed");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        message.success("Attachment deleted");
        fetchAttachments();
      } else {
        message.error("Failed to delete attachment");
      }
    } catch (err) {
      message.error("Error deleting attachment");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      if (res.ok) {
        message.success("Project restored to selected version!");
        fetchProject();
        fetchVersions();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to restore version");
      }
    } catch (err) {
      message.error("Failed to restore version");
    }
  };

  // UI helpers
  const getPriorityColor = (p: string) => {
    switch (p) {
      case "Critical": return "red";
      case "High": return "orange";
      case "Medium": return "blue";
      default: return "default";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Approved": return "success";
      case "Reviewed": return "purple";
      case "Completed": return "cyan";
      case "Active": return "processing";
      default: return "warning";
    }
  };

  if (loading || !project) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Text type="secondary">Loading project details...</Text>
      </div>
    );
  }

  // Blocker priority counters
  const openBlockers = blockers.filter((b) => b.status === "Open" || b.status === "In Progress");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 50 }}>
      {/* Header Bar */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <Space direction="vertical" size={4}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, color: "#676879", fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <Title level={3} style={{ margin: 0 }}>
              {project.title || project.clientDetails.companyName}
            </Title>
            <Tag color={getPriorityColor(project.priority)}>{project.priority} Priority</Tag>
            <Tag color={getStatusColor(project.status)}>{project.status}</Tag>
            {openBlockers.length > 0 && (
              <Badge count={openBlockers.length} style={{ backgroundColor: "#ff4d4f" }}>
                <Tag color="error" style={{ margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertOctagon size={12} /> Blocked
                </Tag>
              </Badge>
            )}
          </div>
          <Text type="secondary">Company: {project.clientDetails.companyName} | Created by: {project.createdBy?.name || "Unknown"}</Text>
        </Space>
        
        <Button type="primary" onClick={() => setIsEditModalOpen(true)} style={{ backgroundColor: "#00897b", border: "none" }}>
          Edit Specifications
        </Button>
      </div>

      {/* Main Tabs */}
      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
        <Tabs defaultActiveKey="1" items={[
          {
            key: "1",
            label: "Overview",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Row gutter={[32, 32]}>
                  <Col xs={24} lg={16}>
                    <Space direction="vertical" size={24} style={{ width: "100%" }}>
                      <div>
                        <Title level={5}>Use Case & Objective</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.useCase || "No use case details provided yet. Click 'Edit Specifications' to add."}
                        </Paragraph>
                      </div>

                      <Divider style={{ margin: "12px 0" }} />

                      <div>
                        <Title level={5}>Target Users</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.targetUsers || "No target users provided yet."}
                        </Paragraph>
                      </div>

                      <Divider style={{ margin: "12px 0" }} />

                      <div>
                        <Title level={5}>Functional Requirements</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.functionalRequirements || "No functional requirements listed."}
                        </Paragraph>
                      </div>

                      <Divider style={{ margin: "12px 0" }} />

                      <div>
                        <Title level={5}>Non-Functional Requirements</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.nonFunctionalRequirements || "No non-functional requirements listed."}
                        </Paragraph>
                      </div>

                      <Divider style={{ margin: "12px 0" }} />

                      <div>
                        <Title level={5}>System Integrations</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.integrations || "No external integrations mentioned."}
                        </Paragraph>
                      </div>
                    </Space>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Space direction="vertical" size={20} style={{ width: "100%" }}>
                      <Card title="Quick Metadata" size="small" styles={{ body: { padding: 16 } }} style={{ borderRadius: 8, background: "#fafafa" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div>
                            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>CLIENT BUDGET</Text>
                            <Text style={{ fontWeight: 600, fontSize: 16 }}>{project.budget || "Not Specified"}</Text>
                          </div>
                          <div>
                            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>TIMELINE</Text>
                            <Text style={{ fontWeight: 500 }}>
                              {dayjs(project.timeline.startDate).format("MMM DD, YYYY")} - {dayjs(project.timeline.endDate).format("MMM DD, YYYY")}
                            </Text>
                          </div>
                          <div>
                            <Text type="secondary" style={{ display: "block", fontSize: 11 }}>CONTACT PERSON</Text>
                            <Text style={{ fontWeight: 500 }}>{project.clientDetails.contactPerson || "N/A"} ({project.clientDetails.email})</Text>
                          </div>
                        </div>
                      </Card>

                      <Card title="Scope & Platform Deliverables" size="small" styles={{ body: { padding: 16 } }} style={{ borderRadius: 8, background: "#fafafa" }}>
                        <Space direction="vertical" style={{ width: "100%" }}>
                          <Checkbox checked={project.features.dashboard} disabled>Dashboard Interface</Checkbox>
                          <Checkbox checked={project.features.webApp} disabled>Web Application</Checkbox>
                          <Checkbox checked={project.features.androidApp} disabled>Android App</Checkbox>
                          <Checkbox checked={project.features.iosApp} disabled>iOS App</Checkbox>
                          <Checkbox checked={project.features.adminPanel} disabled>Admin Control Panel</Checkbox>
                        </Space>
                      </Card>

                      {project.extraAddOns && (
                        <Card title="Extra Add-ons" size="small" styles={{ body: { padding: 16 } }} style={{ borderRadius: 8, background: "#fafafa" }}>
                          <Paragraph style={{ margin: 0 }}>{project.extraAddOns}</Paragraph>
                        </Card>
                      )}
                    </Space>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: "2",
            label: "Tasks & Sync",
            children: (
              <div style={{ padding: "12px 0" }}>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
                  <Button type="primary" icon={<Plus size={14} />} onClick={() => setIsTaskModalOpen(true)} style={{ backgroundColor: "#00897b", border: "none" }}>
                    Create Follow-up Task
                  </Button>
                </div>

                <Table
                  dataSource={tasks}
                  rowKey="_id"
                  columns={[
                    {
                      title: "Task Details",
                      dataIndex: "title",
                      key: "title",
                      render: (text, record) => (
                        <Space direction="vertical" size={2}>
                          <Text style={{ fontWeight: 600 }}>{text}</Text>
                          {record.description && <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>}
                        </Space>
                      )
                    },
                    {
                      title: "Assignee",
                      dataIndex: "assignedTo",
                      key: "assignedTo",
                      render: (user) => user?.name || "Unassigned"
                    },
                    {
                      title: "Due Date",
                      dataIndex: "dueDate",
                      key: "dueDate",
                      render: (date) => dayjs(date).format("MMM DD, YYYY h:mm A")
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      key: "status",
                      render: (status, record) => (
                        <Select
                          value={status || "Pending"}
                          size="small"
                          style={{ width: 120 }}
                          onChange={(val) => handleUpdateTaskStatus(record._id, val)}
                          options={[
                            { label: "Pending", value: "Pending" },
                            { label: "Completed", value: "Completed" },
                            { label: "Cancelled", value: "Cancelled" },
                          ]}
                        />
                      )
                    },
                    {
                      title: "Google Calendar Sync",
                      dataIndex: "syncStatus",
                      key: "syncStatus",
                      render: (status, record) => (
                        <Space direction="vertical" size={2}>
                          <Tag color={status === "Synced" ? "success" : status === "Sync failed" ? "error" : "default"}>
                            {status || "Not synced"}
                          </Tag>
                          {record.syncError && <Text type="danger" style={{ fontSize: 10 }}>{record.syncError}</Text>}
                        </Space>
                      )
                    },
                    {
                      title: "Actions",
                      key: "actions",
                      render: (_, record) => (
                        <Popconfirm title="Delete task?" onConfirm={() => handleDeleteTask(record._id)}>
                          <Button danger size="small" icon={<Trash2 size={14} />} type="text" />
                        </Popconfirm>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: "3",
            label: "Discussion/Chat",
            children: (
              <div style={{ padding: "12px 0" }}>
                {/* Chat Message Panel */}
                <div style={{ height: 400, overflowY: "auto", border: "1px solid #f0f0f0", borderRadius: 8, padding: 16, backgroundColor: "#fafafa", marginBottom: 16 }}>
                  <List
                    dataSource={chatMessages}
                    renderItem={(msg) => (
                      <List.Item style={{ borderBottom: "none", padding: "8px 0" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", width: "100%" }}>
                          <Avatar icon={<UserIcon size={14} />} style={{ backgroundColor: msg.senderId?.role === "TECH_TEAM" ? "#1890ff" : "#ffcd00" }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                              <Text style={{ fontWeight: 600 }}>{msg.senderId?.name}</Text>
                              <Tag color={msg.senderId?.role === "TECH_TEAM" ? "blue" : msg.senderId?.role === "ADMIN" ? "red" : "gold"} style={{ fontSize: 10 }}>
                                {msg.senderId?.role}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(msg.createdAt).format("MMM DD, h:mm A")}</Text>
                            </div>
                            <Paragraph style={{ margin: "4px 0 0 0", whiteSpace: "pre-line" }}>
                              {msg.message}
                            </Paragraph>

                            {/* Mentions tags */}
                            {msg.mentions && msg.mentions.length > 0 && (
                              <div style={{ marginTop: 4 }}>
                                {msg.mentions.map((men: any) => (
                                  <Tag key={men._id} color="purple" style={{ fontSize: 10 }}>@{men.name}</Tag>
                                ))}
                              </div>
                            )}

                            {/* Attachments inside Chat message */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                {msg.attachments.map((file: any, i: number) => (
                                  <a key={i} href={file.path} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#0073ea" }}>
                                    <Paperclip size={12} /> {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </List.Item>
                    )}
                  />
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat inputs */}
                <Card size="small" styles={{ body: { padding: 12 } }} style={{ borderRadius: 8 }}>
                  <TextArea
                    rows={3}
                    placeholder="Ask a question, request details, or post an update..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    style={{ marginBottom: 12 }}
                  />
                  
                  <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={16}>
                      <Space wrap>
                        {/* Mention list */}
                        <Select
                          mode="multiple"
                          style={{ minWidth: 200, maxWidth: 300 }}
                          placeholder="Mention team members"
                          value={chatMentions}
                          onChange={(val) => setChatMentions(val)}
                          options={users.map((u) => ({ label: `@${u.name} (${u.role})`, value: u._id }))}
                          size="small"
                        />

                        {/* File upload */}
                        <Upload
                          beforeUpload={(file) => {
                            setChatFile(file);
                            return false;
                          }}
                          onRemove={() => setChatFile(null)}
                          fileList={chatFile ? [chatFile] : []}
                          maxCount={1}
                        >
                          <Button size="small" icon={<Paperclip size={12} />}>Attach File</Button>
                        </Upload>
                      </Space>
                    </Col>

                    <Col xs={24} md={8} style={{ textAlign: "right" }}>
                      <Button
                        type="primary"
                        onClick={handlePostChatMessage}
                        loading={chatUploading}
                        style={{ backgroundColor: "#00897b", border: "none" }}
                      >
                        Send Message
                      </Button>
                    </Col>
                  </Row>
                </Card>
              </div>
            )
          },
          {
            key: "4",
            label: "Dependencies & Blockers",
            children: (
              <div style={{ padding: "12px 0" }}>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "flex-end" }}>
                  <Button type="primary" icon={<Plus size={14} />} onClick={() => setIsBlockerModalOpen(true)} style={{ backgroundColor: "#ff4d4f", border: "none" }}>
                    Raise Blocker / Dependency
                  </Button>
                </div>

                <Table
                  dataSource={blockers}
                  rowKey="_id"
                  columns={[
                    {
                      title: "Blocker details",
                      dataIndex: "title",
                      key: "title",
                      render: (text, record) => (
                        <Space direction="vertical" size={2}>
                          <Text style={{ fontWeight: 600 }}>{text}</Text>
                          {record.description && <Text type="secondary" style={{ fontSize: 12 }}>{record.description}</Text>}
                        </Space>
                      )
                    },
                    {
                      title: "Type",
                      dataIndex: "type",
                      key: "type",
                    },
                    {
                      title: "Priority",
                      dataIndex: "priority",
                      key: "priority",
                      render: (p) => <Tag color={getPriorityColor(p)}>{p}</Tag>
                    },
                    {
                      title: "Owner",
                      dataIndex: "ownerId",
                      key: "ownerId",
                      render: (owner) => owner?.name || "Unknown"
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      key: "status",
                      render: (status) => (
                        <Tag color={status === "Resolved" ? "success" : status === "In Progress" ? "processing" : status === "Cancelled" ? "default" : "error"}>
                          {status}
                        </Tag>
                      )
                    },
                    {
                      title: "Resolution Details",
                      key: "resolution",
                      render: (_, record) => {
                        if (record.status === "Resolved") {
                          return (
                            <Space direction="vertical" size={2}>
                              <Text style={{ fontSize: 11, fontStyle: "italic" }}>"{record.resolutionNote}"</Text>
                              <Text type="secondary" style={{ fontSize: 9 }}>Resolved by {record.resolvedBy?.name} on {dayjs(record.resolvedAt).format("MMM DD, YYYY")}</Text>
                            </Space>
                          );
                        }
                        return <Text type="secondary">-</Text>;
                      }
                    },
                    {
                      title: "Action",
                      key: "action",
                      render: (_, record) => {
                        if (record.status !== "Resolved") {
                          return (
                            <Button
                              type="primary"
                              size="small"
                              style={{ backgroundColor: "#52c41a", border: "none" }}
                              onClick={() => {
                                setSelectedBlocker(record);
                                setIsResolveModalOpen(true);
                              }}
                            >
                              Mark Resolved
                            </Button>
                          );
                        }
                        return null;
                      }
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: "5",
            label: "Attachments",
            children: (
              <div style={{ padding: "12px 0" }}>
                <div style={{ marginBottom: 24, textAlign: "center", border: "2px dashed #00897b", padding: 24, borderRadius: 8 }}>
                  <Paragraph>Upload contract drafts, technical diagrams, workflows, or target scopes securely.</Paragraph>
                  <Upload
                    customRequest={handleAttachmentUpload}
                    showUploadList={false}
                    multiple
                  >
                    <Button type="primary" style={{ backgroundColor: "#00897b", border: "none" }}>
                      Choose Files to Upload
                    </Button>
                  </Upload>
                </div>

                <Title level={5}>Project Files</Title>
                <Table
                  dataSource={attachments}
                  rowKey="_id"
                  columns={[
                    {
                      title: "Filename",
                      dataIndex: "originalName",
                      key: "originalName",
                      render: (name, record) => (
                        <Space>
                          <Paperclip size={16} color="#00897b" />
                          <Text style={{ fontWeight: 500 }}>{name}</Text>
                        </Space>
                      )
                    },
                    {
                      title: "Size",
                      dataIndex: "size",
                      key: "size",
                      render: (s) => `${(s / 1024).toFixed(1)} KB`
                    },
                    {
                      title: "Uploaded By",
                      dataIndex: "uploadedBy",
                      key: "uploadedBy",
                      render: (user) => user?.name || "Unknown"
                    },
                    {
                      title: "Uploaded Date",
                      dataIndex: "createdAt",
                      key: "createdAt",
                      render: (date) => dayjs(date).format("MMM DD, YYYY h:mm A")
                    },
                    {
                      title: "Actions",
                      key: "actions",
                      render: (_, record) => (
                        <Space>
                          <Button
                            icon={<Download size={14} />}
                            type="text"
                            onClick={() => {
                              window.open(`/api/projects/${id}/attachments/${record._id}`);
                            }}
                          />
                          <Popconfirm title="Delete file?" onConfirm={() => handleDeleteAttachment(record._id)}>
                            <Button danger icon={<Trash2 size={14} />} type="text" />
                          </Popconfirm>
                        </Space>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: "6",
            label: "Version History",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Timeline
                  mode="left"
                  items={versions.map((ver) => ({
                    label: dayjs(ver.editedAt).format("MMM DD, YYYY h:mm A"),
                    children: (
                      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                          <Text style={{ fontWeight: 600 }}>Version {ver.version} snapshot</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>Edited by: {ver.editedBy?.name} ({ver.editedBy?.role})</Text>
                        </div>
                        <Paragraph style={{ marginTop: 8, fontStyle: "italic", fontSize: 12 }}>
                          Reason: "{ver.changeReason || "No explanation provided."}"
                        </Paragraph>

                        {/* List of changes */}
                        {ver.changedFields && ver.changedFields.length > 0 && (
                          <div style={{ marginTop: 8, backgroundColor: "#fafafa", padding: 8, borderRadius: 6 }}>
                            <Text style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 4 }}>CHANGED FIELDS:</Text>
                            {ver.changedFields.map((ch: any, i: number) => (
                              <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
                                <Tag color="blue">{ch.field}</Tag>
                                <span style={{ textDecoration: "line-through", color: "#999", marginRight: 8 }}>
                                  {typeof ch.oldValue === "object" ? JSON.stringify(ch.oldValue) : String(ch.oldValue)}
                                </span>
                                <strong>➔</strong>
                                <span style={{ color: "#52c41a", marginLeft: 8 }}>
                                  {typeof ch.newValue === "object" ? JSON.stringify(ch.newValue) : String(ch.newValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: 12, textAlign: "right" }}>
                          <Popconfirm title="Are you sure you want to restore this version? This will overwrite the current project specifications." onConfirm={() => handleRestoreVersion(ver._id)}>
                            <Button size="small" icon={<History size={12} />} style={{ border: "1px solid #d9d9d9" }}>
                              Restore this version
                            </Button>
                          </Popconfirm>
                        </div>
                      </Card>
                    )
                  }))}
                />
              </div>
            )
          }
        ]} />
      </Card>

      {/* MODAL 1: Edit Project Details */}
      <Modal
        title="Edit Project Specifications"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        width={750}
        style={{ top: 40 }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateProject}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="title" label="Requirement / Project Title" rules={[{ required: true, message: "Please input title" }]}>
                <Input placeholder="e.g. Android Customer Delivery App" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label="Contact Person">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="email" label="Contact Email" rules={[{ required: true, type: "email" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select options={[
                  { label: "Low", value: "Low" },
                  { label: "Medium", value: "Medium" },
                  { label: "High", value: "High" },
                  { label: "Critical", value: "Critical" },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="timeline" label="Timeline Dates" rules={[{ required: true }]}>
                <DatePicker.RangePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Project Status" rules={[{ required: true }]}>
                <Select options={[
                  { label: "Pending", value: "Pending" },
                  { label: "Active", value: "Active" },
                  { label: "Completed", value: "Completed" },
                  { label: "Reviewed", value: "Reviewed" },
                  { label: "Approved", value: "Approved" },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Features Scope">
                <div style={{ display: "flex", gap: 20 }}>
                  <Form.Item name="dashboard" valuePropName="checked" noStyle><Checkbox>Dashboard</Checkbox></Form.Item>
                  <Form.Item name="webApp" valuePropName="checked" noStyle><Checkbox>Web App</Checkbox></Form.Item>
                  <Form.Item name="androidApp" valuePropName="checked" noStyle><Checkbox>Android App</Checkbox></Form.Item>
                  <Form.Item name="iosApp" valuePropName="checked" noStyle><Checkbox>iOS App</Checkbox></Form.Item>
                  <Form.Item name="adminPanel" valuePropName="checked" noStyle><Checkbox>Admin Panel</Checkbox></Form.Item>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="useCase" label="Use Case / Core Objective">
            <TextArea rows={3} placeholder="What business problem does this solve? Who is the end client?" />
          </Form.Item>

          <Form.Item name="targetUsers" label="Target Users">
            <TextArea rows={2} placeholder="Who are the primary end users? e.g. Warehouse operators, retail customers" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="functionalRequirements" label="Functional Requirements">
                <TextArea rows={3} placeholder="List out explicit key features, user flows, operations..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nonFunctionalRequirements" label="Non-Functional Requirements">
                <TextArea rows={3} placeholder="e.g. Offline sync support, loading speed, daily volumes..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="budget" label="Est. Budget">
                <Input placeholder="e.g. $25k, ₹15L, etc." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="integrations" label="Integrations Needed">
                <Input placeholder="e.g. Razorpay, SendGrid, SAP ERP" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="extraAddOns" label="Extra Add-ons / Client notes">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item name="changeReason" label="Reason for this change (Logged to Version Control)" rules={[{ required: true, message: "Please specify why you are making this edit." }]}>
            <Input placeholder="e.g. Added functional requirements specified by client on call" />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsEditModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Save Changes</Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 2: Create Task */}
      <Modal
        title="Create Follow-up / Clarification Task"
        open={isTaskModalOpen}
        onCancel={() => setIsTaskModalOpen(false)}
        footer={null}
      >
        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item name="title" label="Task Title" rules={[{ required: true, message: "Task title is required" }]}>
            <Input placeholder="e.g. Clarify payment gateway merchant accounts" />
          </Form.Item>

          <Form.Item name="description" label="Task Description">
            <TextArea rows={3} placeholder="Add specific details or questions to resolve." />
          </Form.Item>

          <Form.Item name="dueDate" label="Due Date & Time" rules={[{ required: true, message: "Select deadline" }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="assignedTo" label="Assign to Employee" rules={[{ required: true, message: "Assignee is required" }]}>
            <Select placeholder="Select team member" options={users.map((u) => ({ label: `${u.name} (${u.role})`, value: u._id }))} />
          </Form.Item>

          <Form.Item name="syncToGoogleCalendar" valuePropName="checked">
            <Checkbox>Sync automatically to Google Calendar (of assignee)</Checkbox>
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsTaskModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Create Task</Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 3: Raise Blocker */}
      <Modal
        title="Raise Blocker / Dependency"
        open={isBlockerModalOpen}
        onCancel={() => setIsBlockerModalOpen(false)}
        footer={null}
      >
        <Form form={blockerForm} layout="vertical" onFinish={handleCreateBlocker}>
          <Form.Item name="title" label="Blocker Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="e.g. Missing staging API credentials" />
          </Form.Item>

          <Form.Item name="description" label="Detailed Description">
            <TextArea rows={3} placeholder="Describe what is blocked and how to resolve it." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Blocker Type" rules={[{ required: true }]}>
                <Select placeholder="Select Type" options={[
                  { label: "Client-side", value: "Client-side" },
                  { label: "Internal", value: "Internal" },
                  { label: "Third-party", value: "Third-party" },
                  { label: "Technical", value: "Technical" },
                  { label: "Commercial", value: "Commercial" },
                  { label: "Legal", value: "Legal" },
                  { label: "API", value: "API" },
                  { label: "Data", value: "Data" },
                  { label: "Hardware", value: "Hardware" },
                  { label: "Other", value: "Other" },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Blocker Priority" rules={[{ required: true }]}>
                <Select placeholder="Select Priority" options={[
                  { label: "Low", value: "Low" },
                  { label: "Medium", value: "Medium" },
                  { label: "High", value: "High" },
                  { label: "Critical", value: "Critical" },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ownerId" label="Owner (To Resolve)" rules={[{ required: true }]}>
                <Select placeholder="Select Owner" options={users.map((u) => ({ label: `${u.name} (${u.role})`, value: u._id }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dueDate" label="Target Resolution Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsBlockerModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#ff4d4f", border: "none" }}>Raise Blocker</Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 4: Resolve Blocker */}
      <Modal
        title="Resolve Blocker"
        open={isResolveModalOpen}
        onCancel={() => setIsResolveModalOpen(false)}
        footer={null}
      >
        <Form form={resolveForm} layout="vertical" onFinish={handleResolveBlocker}>
          <Paragraph>Specify how the blocker was resolved and provide any details.</Paragraph>
          <Form.Item name="resolutionNote" label="Resolution Notes" rules={[{ required: true, message: "Please enter resolution notes" }]}>
            <TextArea rows={4} placeholder="e.g. Client provided API keys on email, staging connection is now active." />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsResolveModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#52c41a", border: "none" }}>Submit Resolution</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

// ----------------------------------------------------
// Main Exports (Handles Promise params unwrapping)
// ----------------------------------------------------
export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  return <ProjectDetailsClient id={id} />;
}
