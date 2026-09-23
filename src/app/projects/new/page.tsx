"use client";

import React, { useState, useEffect } from "react";
import {
  Typography,
  Form,
  Input,
  Button,
  Card,
  DatePicker,
  Row,
  Col,
  Skeleton,
  App,
  Select,
  Upload,
  Tag,
  Result,
} from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Paperclip } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

const PRIMARY_COLOR = "#00897b"; // Official Brand Teal

export default function NewProjectPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [mounting, setMounting] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const router = useRouter();
  const { message } = App.useApp();

  useEffect(() => {
    async function init() {
      try {
        const userRes = await fetch("/api/user/me");
        if (userRes.ok) {
          const userData = await userRes.json();
          setCurrentUser(userData.user);
          if (userData.user?.role !== "SYSTEM_ADMIN") {
            message.error("Access Denied: Only System Administrator has access to create projects.");
            router.push("/projects");
            return;
          }
          // Fetch registered employees for Project Manager and team assignment
          const usersRes = await fetch("/api/users");
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(Array.isArray(usersData) ? usersData : []);
          }
        } else {
          router.push("/auth/login");
        }
      } catch (err) {
        console.error("Auth / users load failed:", err);
      } finally {
        setAuthChecking(false);
        setMounting(false);
      }
    }
    init();
  }, [router, message]);

  const onFinish = async (values: any) => {
    setSubmitting(true);

    try {
      // 1. Create the project
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        message.error(data.error || "Failed to create project");
        setSubmitting(false);
        return;
      }

      const projectId = data.data?._id || data._id;

      // 2. Upload attachments sequentially if selected
      if (fileList.length > 0) {
        message.loading({ content: "Uploading file attachments to Project Drive...", key: "uploading" });

        let uploadCount = 0;
        for (const fileItem of fileList) {
          const rawFile = fileItem.originFileObj || fileItem;
          const fileName = rawFile.name || fileItem.name || "attachment";
          const formData = new FormData();
          formData.append("file", rawFile, fileName);
          formData.append("folder", "/");

          try {
            const uploadRes = await fetch(`/api/projects/${projectId}/attachments`, {
              method: "POST",
              body: formData,
            });
            if (uploadRes.ok) {
              uploadCount++;
            } else {
              const errData = await uploadRes.json();
              console.warn(`Failed to upload ${fileName}:`, errData.error);
            }
          } catch (err) {
            console.error("Failed to upload file during creation", err);
          }
        }

        message.success({ content: `Project created and ${uploadCount} document(s) uploaded to Project Drive!`, key: "uploading" });
      } else {
        message.success("Project created successfully!");
      }

      form.resetFields();
      setFileList([]);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error(error);
      message.error("Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };


  if (authChecking || mounting) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== "SYSTEM_ADMIN") {
    return (
      <Card style={{ marginTop: 40, textAlign: "center", borderRadius: 12 }}>
        <Result
          status="403"
          title="Access Restricted: Admin Only"
          subTitle="Only authorized administrators have authorization to create new projects."
          extra={
            <Button type="primary" onClick={() => router.push("/projects")}>
              Back to Projects
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, maxWidth: "100%" }}>
      {/* Header */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        marginBottom: 20,
        flexWrap: "wrap",
        gap: 16,
        flex: "0 0 auto"
      }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700, fontSize: 24 }}>
            Create New Project
          </Title>
          <Text type="secondary" style={{ fontSize: 14 }}>
            Set up the project details, Project Manager assignment, and roadmap timeline.
          </Text>
        </div>
        <Link href="/projects">
          <Button icon={<ArrowLeftOutlined />} size="small">Back to list</Button>
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, paddingBottom: 40, minWidth: 0, maxWidth: "100%" }} className="hide-scrollbar">
        <Skeleton active loading={mounting} paragraph={{ rows: 15 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{
              priority: "Medium",
            }}
          >
            {/* Section 1: Client & Project Identity */}
            <Card
              variant="borderless"
              style={{
                borderRadius: 16,
                marginBottom: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #f0f0f0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: PRIMARY_COLOR
                }}>
                  <UserOutlined />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>Client & Project Identity</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Specify the client company name or project identity and detailed description.
                  </Text>
                </div>
              </div>

              <Form.Item
                name="title"
                label={<span style={{ fontWeight: 600 }}>Requirement / Project Title</span>}
                rules={[{ required: true, message: "Project title is required" }]}
                style={{ marginBottom: 20 }}
              >
                <Input size="large" placeholder="E.g., NovaTech Solutions, Apex Healthcare Systems" />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span style={{ fontWeight: 600 }}>Project Description</span>}
                style={{ marginBottom: 8 }}
              >
                <TextArea
                  rows={4}
                  placeholder="Provide an executive summary, scope, deliverables, and objectives for this client project..."
                />
              </Form.Item>
            </Card>

            {/* Section 2: Project Roadmap & Timeline */}
            <Card
              variant="borderless"
              style={{
                borderRadius: 16,
                marginBottom: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #f0f0f0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ea580c"
                }}>
                  <CalendarOutlined />
                </div>
                <Title level={4} style={{ margin: 0 }}>Project Roadmap & Scope</Title>
              </div>

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="timeline"
                    label={<span style={{ fontWeight: 500 }}>Target Timeline Range</span>}
                    rules={[{ required: true, message: "Timeline range is required" }]}
                  >
                    <RangePicker size="large" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="priority"
                    label={<span style={{ fontWeight: 500 }}>Priority Level</span>}
                    rules={[{ required: true }]}
                  >
                    <Select size="large" options={[
                      { label: "Low", value: "Low" },
                      { label: "Medium", value: "Medium" },
                      { label: "High", value: "High" },
                      { label: "Critical", value: "Critical" },
                    ]} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Section 3: Project Manager & Team Assignment */}
            <Card
              variant="borderless"
              style={{
                borderRadius: 16,
                marginBottom: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #f0f0f0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "#ede9fe",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#7c3aed"
                  }}>
                    <TeamOutlined />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0 }}>Project Manager & Team Assignment</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Appoint the Project Manager and assign project team members.
                    </Text>
                  </div>
                </div>
                <Tag color="purple">Admin Authorized</Tag>
              </div>

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="techOwner"
                    label={<span style={{ fontWeight: 500 }}>Project Manager</span>}
                    extra="Designate the primary Project Manager responsible for technical oversight, work items, and delivery."
                  >
                    <Select
                      size="large"
                      placeholder="Select Project Manager (Optional)"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={users.map((u) => ({
                        label: `${u.name} (${u.designation || u.role})`,
                        value: u._id,
                      }))}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} md={12}>
                  <Form.Item
                    name="techTeamMembers"
                    label={<span style={{ fontWeight: 500 }}>Assigned Project Members</span>}
                    extra="Select all employee members who will work on this project."
                  >
                    <Select
                      mode="multiple"
                      size="large"
                      placeholder="Select Team Members (Optional)"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={users.map((u) => ({
                        label: `${u.name} (${u.designation || u.role})`,
                        value: u._id,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Section 4: Attachments */}
            <Card
              variant="borderless"
              style={{
                borderRadius: 16,
                marginBottom: 32,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #f0f0f0"
              }}
            >
              <Title level={5} style={{ marginBottom: 12 }}>Initial File Attachments</Title>
              <Paragraph type="secondary">Upload client specification PDFs, scope emails, or mockups.</Paragraph>

              <Upload
                beforeUpload={(file) => {
                  setFileList((prev) => [...prev, file]);
                  return false;
                }}
                onRemove={(file) => {
                  setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
                }}
                fileList={fileList}
                multiple
              >
                <Button icon={<Paperclip size={14} />} size="large">Add Document Draft</Button>
              </Upload>
            </Card>

            {/* Footer Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16 }}>
              <Button size="large" onClick={() => { form.resetFields(); setFileList([]); }}>
                Clear Form
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={submitting}
                style={{ padding: "0 32px", backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }}
              >
                Create Project
              </Button>
            </div>
          </Form>
        </Skeleton>
      </div>
    </div>
  );
}
