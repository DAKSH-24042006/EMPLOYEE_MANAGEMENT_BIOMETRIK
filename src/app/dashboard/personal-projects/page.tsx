"use client";

import React, { useState, useEffect } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Button,
  Select,
  Tag,
  Modal,
  Skeleton,
  App,
  Empty,
  Tooltip,
  Space,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  UserOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import Link from "next/link";
import dayjs from "dayjs";
import { normalizeProjectStatus } from "@/lib/constants";

const { Title, Text, Paragraph } = Typography;

interface PersonalProjectItem {
  _id: string;
  title: string;
  description?: string;
  status: string;
  clientDetails: {
    companyName: string;
    contactPerson?: string;
    email?: string;
  };
  techOwner?: {
    _id: string;
    name: string;
    email: string;
  } | null;
  timeline?: {
    startDate?: string | null;
    endDate?: string | null;
  };
  estimatedDeliveryDate?: string | null;
  pinnedAt: string;
}

interface EligibleProjectItem {
  _id: string;
  title: string;
  status: string;
  clientName: string;
  projectManager: string;
}

const STATUS_COLOR_MAP: Record<string, string> = {
  "In Progress": "processing",
  "On Hold (Backlogged)": "warning",
  "In Testing": "cyan",
  "Live / Deployed": "success",
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

export default function PersonalProjectsPage() {
  const [personalProjects, setPersonalProjects] = useState<PersonalProjectItem[]>([]);
  const [eligibleProjects, setEligibleProjects] = useState<EligibleProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { message } = App.useApp();

  // Load personal projects
  const fetchPersonalProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/pinned-projects", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setPersonalProjects(json.data || []);
      } else {
        message.error(json.error || "Failed to load favourite projects");
      }
    } catch {
      message.error("Network error while loading favourite projects");
    } finally {
      setLoading(false);
    }
  };

  // Load eligible projects for selector
  const fetchEligibleProjects = async () => {
    setEligibleLoading(true);
    try {
      const res = await fetch("/api/user/pinned-projects?eligible=true", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setEligibleProjects(json.data || []);
      } else {
        message.error(json.error || "Failed to load eligible projects");
      }
    } catch {
      message.error("Failed to load eligible projects list");
    } finally {
      setEligibleLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalProjects();
  }, []);

  const handleOpenAddModal = () => {
    setSelectedProjectId(null);
    setIsAddModalOpen(true);
    fetchEligibleProjects();
  };

  // Add project to personal workspace
  const handleAddProject = async () => {
    if (!selectedProjectId) {
      message.warning("Please select a project to add");
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/user/pinned-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      const json = await res.json();

      if (res.ok) {
        message.success(json.message || "Project added to your Favourite Projects");
        setIsAddModalOpen(false);
        setSelectedProjectId(null);
        fetchPersonalProjects();
      } else {
        message.error(json.error || "Failed to add project to Favourite Projects");
      }
    } catch {
      message.error("Failed to add project to Favourite Projects");
    } finally {
      setActionLoading(false);
    }
  };

  // Remove project from personal workspace
  const handleRemoveProject = async (projectId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/user/pinned-projects?projectId=${projectId}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (res.ok) {
        message.success("Project removed from Favourite Projects");
        setPersonalProjects((prev) => prev.filter((p) => p._id !== projectId));
      } else {
        message.error(json.error || "Failed to remove project");
      }
    } catch {
      message.error("Failed to remove project");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 40, width: "100%" }}>
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
          background: "#ffffff",
          padding: "20px 24px",
          borderRadius: 12,
          border: "1px solid #E2E8F0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, color: "#0F172A", fontWeight: 700 }}>
            Favourite Projects
          </Title>
          <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: "block" }}>
            Your quick-access project workspace. Displays projects where you are assigned as Project
            Manager, Developer, QA, or Product Owner.
          </Text>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchPersonalProjects} loading={loading}>
            Refresh
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenAddModal}
            style={{
              backgroundColor: "#00897b",
              borderColor: "#00897b",
              fontWeight: 500,
            }}
          >
            Add Project
          </Button>
        </Space>
      </div>

      {/* Main Grid or Loading / Empty States */}
      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} md={8} lg={6} key={i}>
              <Card style={{ borderRadius: 12, border: "1px solid #E2E8F0" }}>
                <Skeleton active paragraph={{ rows: 4 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : personalProjects.length === 0 ? (
        <Card
          style={{
            borderRadius: 14,
            border: "1px dashed #CBD5E1",
            textAlign: "center",
            padding: "48px 24px",
            background: "#ffffff",
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div style={{ maxWidth: 440, margin: "0 auto" }}>
                <Title level={5} style={{ color: "#334155", marginBottom: 6 }}>
                  No Favourite Projects Pinned
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  You haven&apos;t added any projects to your favourite workspace yet. Click the
                  button below to select from projects you participate in.
                </Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenAddModal}
              style={{
                backgroundColor: "#00897b",
                borderColor: "#00897b",
                marginTop: 8,
              }}
            >
              Add Project
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[18, 18]}>
          {personalProjects.map((project) => {
            const finishDate = project.timeline?.endDate || project.estimatedDeliveryDate || null;
            const canonicalStatus = normalizeProjectStatus(project.status);
            const statusColor = STATUS_COLOR_MAP[canonicalStatus] || "default";

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={project._id}>
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: "16px 18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    transition: "all 0.2s ease",
                  }}
                  className="hover:shadow-md hover:border-teal-500"
                >
                  {/* Top section: Title & Status */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <Link
                        href={`/projects/${project._id}`}
                        style={{
                          fontWeight: 600,
                          fontSize: 15,
                          color: "#0F172A",
                          lineHeight: 1.3,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                        className="hover:text-teal-700"
                        title={project.title}
                      >
                        {project.title}
                      </Link>

                      <Popconfirm
                        title="Remove from Favourite Projects?"
                        description="This removes the project from your favourite workspace only. The project itself remains untouched."
                        okText="Remove"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleRemoveProject(project._id)}
                      >
                        <Tooltip title="Remove from favourite projects">
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                            style={{ height: 24, width: 24, padding: 0 }}
                          />
                        </Tooltip>
                      </Popconfirm>
                    </div>

                    {/* Status Badge */}
                    <div style={{ marginBottom: 12 }}>
                      <Tag
                        color={statusColor}
                        style={{ borderRadius: 10, fontSize: 11, fontWeight: 500 }}
                      >
                        {canonicalStatus}
                      </Tag>
                    </div>

                    {/* Useful Project Information */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        fontSize: 12,
                        color: "#475569",
                        marginBottom: 16,
                        background: "#F8FAFC",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: "1px solid #F1F5F9",
                      }}
                    >
                      {/* Client */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          overflow: "hidden",
                        }}
                      >
                        <BankOutlined style={{ color: "#64748B", fontSize: 13, flexShrink: 0 }} />
                        <span style={{ color: "#64748B", flexShrink: 0 }}>Client:</span>
                        <span
                          style={{
                            fontWeight: 500,
                            color: "#1E293B",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={project.clientDetails?.companyName || "N/A"}
                        >
                          {project.clientDetails?.companyName || "N/A"}
                        </span>
                      </div>

                      {/* Project Manager */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          overflow: "hidden",
                        }}
                      >
                        <UserOutlined style={{ color: "#64748B", fontSize: 13, flexShrink: 0 }} />
                        <span style={{ color: "#64748B", flexShrink: 0 }}>Manager:</span>
                        <span
                          style={{
                            fontWeight: 500,
                            color: "#1E293B",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={project.techOwner?.name || "Unassigned"}
                        >
                          {project.techOwner?.name || "Unassigned"}
                        </span>
                      </div>

                      {/* Finish Date */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          overflow: "hidden",
                        }}
                      >
                        <CalendarOutlined
                          style={{ color: "#64748B", fontSize: 13, flexShrink: 0 }}
                        />
                        <span style={{ color: "#64748B", flexShrink: 0 }}>Finish Date:</span>
                        <span
                          style={{
                            fontWeight: 500,
                            color: finishDate ? "#1E293B" : "#94A3B8",
                          }}
                        >
                          {finishDate ? dayjs(finishDate).format("MMM DD, YYYY") : "Not set"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action: Direct Workspace Link */}
                  <div style={{ paddingTop: 8, borderTop: "1px solid #F1F5F9" }}>
                    <Link href={`/projects/${project._id}`} style={{ width: "100%" }}>
                      <Button
                        type="primary"
                        block
                        icon={<FolderOpenOutlined />}
                        style={{
                          backgroundColor: "#00897b",
                          borderColor: "#00897b",
                          borderRadius: 8,
                          fontWeight: 500,
                          fontSize: 13,
                        }}
                      >
                        Open Workspace
                      </Button>
                    </Link>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}

      {/* Add Project Modal */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PlusOutlined style={{ color: "#00897b" }} />
            <span>Add Project to Favourite Workspace</span>
          </div>
        }
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsAddModalOpen(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={actionLoading}
            disabled={!selectedProjectId}
            onClick={handleAddProject}
            style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
          >
            Add to Favourite Projects
          </Button>,
        ]}
        destroyOnClose
      >
        <div style={{ padding: "12px 0" }}>
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
            Select an eligible project to pin to your favourite workspace. Only projects where you
            have an active membership (or all projects if you are a verified System Admin) are
            listed below.
          </Paragraph>

          <div style={{ marginBottom: 8 }}>
            <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
              Select Project:
            </Text>
            <Select
              showSearch
              placeholder="Search by project title or client..."
              loading={eligibleLoading}
              value={selectedProjectId}
              onChange={(val) => setSelectedProjectId(val)}
              style={{ width: "100%" }}
              size="large"
              filterOption={(input, option) =>
                String(option?.label ?? "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              options={eligibleProjects.map((p) => ({
                value: p._id,
                label: `${p.title} (${p.clientName ? p.clientName + " · " : ""}${p.status})`,
              }))}
              notFoundContent={
                eligibleLoading ? (
                  <div style={{ padding: 12, textAlign: "center" }}>Loading projects...</div>
                ) : (
                  <div style={{ padding: 12, textAlign: "center", color: "#94A3B8" }}>
                    No eligible projects available to pin.
                  </div>
                )
              }
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
