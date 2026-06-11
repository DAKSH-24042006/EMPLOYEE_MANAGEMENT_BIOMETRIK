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
  Space,
  Divider,
  Breadcrumb,
  ConfigProvider,
  theme,
  Select,
  Upload
} from "antd";
import {
  ArrowLeftOutlined,
  DesktopOutlined,
  CloudServerOutlined,
  AppleOutlined,
  AndroidOutlined,
  AppstoreOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckCircleFilled,
  CheckOutlined,
  PlusOutlined,
  IdcardOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  VideoCameraOutlined,
  SecurityScanOutlined,
  CloudOutlined,
  DisconnectOutlined,
  HddOutlined,
} from "@ant-design/icons";
import { Paperclip } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY_COLOR = "#00897b"; // Official Brand Teal
const SECONDARY_COLOR = "#f0fdfa"; // Ultra-light Teal

const FEATURES = [
  {
    key: "visitorManagement",
    label: "Visitor Mgmt",
    description: "Visitor System",
    icon: <IdcardOutlined />
  },
  {
    key: "attendanceManagement",
    label: "Attendance Mgmt",
    description: "Team Attendance",
    icon: <TeamOutlined />
  },
  {
    key: "digilockerAuthentication",
    label: "Digilocker",
    description: "Secure Auth",
    icon: <SafetyCertificateOutlined />
  },
  {
    key: "webApp",
    label: "Web App",
    description: "Cloud-based portal",
    icon: <GlobalOutlined />
  },
  {
    key: "androidApp",
    label: "Android App",
    description: "Native Play Store",
    icon: <AndroidOutlined />
  },
  {
    key: "iosApp",
    label: "iOS App",
    description: "Native App Store",
    icon: <AppleOutlined />
  },
  {
    key: "videoKYC",
    label: "Video KYC",
    description: "Remote Identity",
    icon: <VideoCameraOutlined />
  },
  {
    key: "rbac",
    label: "RBAC System",
    description: "Role-based Access",
    icon: <SecurityScanOutlined />
  },
  {
    key: "adminPanel",
    label: "Admin Panel",
    description: "Management portal",
    icon: <AppstoreOutlined />
  },
  {
    key: "online",
    label: "Online",
    description: "Active Internet",
    icon: <CloudOutlined />
  },
  {
    key: "offline",
    label: "Offline",
    description: "Local Storage",
    icon: <DisconnectOutlined />
  },
  {
    key: "cloud",
    label: "Cloud",
    description: "Azure / AWS",
    icon: <CloudServerOutlined />
  },
  {
    key: "onPremise",
    label: "On Premise",
    description: "Local Servers",
    icon: <HddOutlined />
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

interface FeatureItemProps {
  checked?: boolean;
  onChange?: (val: boolean) => void;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ checked, onChange, label, description, icon }) => {
  const isSelected = !!checked;

  return (
    <div
      onClick={() => onChange?.(!isSelected)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        border: `1.5px solid ${isSelected ? PRIMARY_COLOR : "#f3f4f6"}`,
        background: isSelected ? "#f0fdfa" : "#fafafa",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        gap: 8,
        height: "100%",
        minHeight: 56,
        position: "relative",
        overflow: "hidden"
      }}
      className="feature-item-hover"
    >
      <div style={{ 
        fontSize: 22, 
        color: isSelected ? PRIMARY_COLOR : "#374151", 
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ 
          display: "block", 
          fontSize: 12, 
          color: "#111827",
          lineHeight: 1.2,
          wordBreak: "break-word"
        }}>
          {label}
        </Text>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: isSelected ? PRIMARY_COLOR : "transparent",
        color: isSelected ? "#fff" : "#9ca3af",
        transition: "all 0.2s ease",
        flexShrink: 0
      }}>
        {isSelected ? (
          <CheckOutlined style={{ fontSize: 12 }} />
        ) : (
          <PlusOutlined style={{ fontSize: 16 }} />
        )}
      </div>

      <style jsx>{`
        .feature-item-hover:hover {
          border-color: ${PRIMARY_COLOR};
          background: #f0fdfa;
        }
      `}</style>
    </div>
  );
};

export default function NewProjectPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [mounting, setMounting] = useState(true);
  const [fileList, setFileList] = useState<any[]>([]);
  const router = useRouter();
  const { message } = App.useApp();

  useEffect(() => {
    const timer = setTimeout(() => setMounting(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const onFinish = async (values: any) => {
    // Check if at least one feature is selected
    const selectedFeatures = FEATURES.map(f => values[f.key]);
    const hasAtLeastOneFeature = selectedFeatures.some(v => v === true);

    if (!hasAtLeastOneFeature) {
      message.error("Please select at least one Application Feature to proceed.");
      document.getElementById('application-features')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

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
        message.loading({ content: "Uploading file attachments...", key: "uploading" });
        
        let uploadCount = 0;
        for (const fileObj of fileList) {
          const formData = new FormData();
          formData.append("file", fileObj.originFileObj || fileObj);

          try {
            const uploadRes = await fetch(`/api/projects/${projectId}/attachments`, {
              method: "POST",
              body: formData,
            });
            if (uploadRes.ok) {
              uploadCount++;
            }
          } catch (err) {
            console.error("Failed to upload file during creation", err);
          }
        }
        
        message.success({ content: `Project created and ${uploadCount} attachments uploaded!`, key: "uploading" });
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

  const contactValidator = () => ({
    validator(_: any, value: string) {
      if (form.getFieldValue('contactPerson') || form.getFieldValue('email')) {
        return Promise.resolve();
      }
      return Promise.reject(new Error('Providing either a Contact Person or Email is required!'));
    },
  });

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* ── Header ── */}
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
            Set up the client details, roadmap timeline, and select required application features.
          </Text>
        </div>
        <Link href="/projects">
          <Button icon={<ArrowLeftOutlined />} size="small">Back to list</Button>
        </Link>
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: 8, paddingBottom: 40 }} className="hide-scrollbar">
        <Skeleton active loading={mounting} paragraph={{ rows: 15 }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{
              visitorManagement: false,
              attendanceManagement: false,
              digilockerAuthentication: false,
              webApp: false,
              androidApp: false,
              iosApp: false,
              videoKYC: false,
              rbac: false,
              adminPanel: false,
              online: false,
              offline: false,
              cloud: false,
              onPremise: false,
              priority: "Medium",
            }}
          >
            {/* Section 1: Project Identity & Client Details */}
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
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: PRIMARY_COLOR
                }}>
                  <UserOutlined />
                </div>
                <Title level={4} style={{ margin: 0 }}>Client & Project Identity</Title>
              </div>

              <Form.Item
                name="title"
                label={<span style={{ fontWeight: 500 }}>Requirement / Project Title</span>}
                rules={[{ required: true, message: "Requirement title is required" }]}
                style={{ marginBottom: 24 }}
              >
                <Input size="large" placeholder="E.g., Android Rider Delivery App" />
              </Form.Item>

              <Row gutter={24}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="companyName"
                    label={<span style={{ fontWeight: 500 }}>Company Name</span>}
                    rules={[{ required: true, message: "Please enter the company name" }]}
                  >
                    <Input size="large" placeholder="E.g., Global Tech Inc." />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="contactPerson"
                    label={<span style={{ fontWeight: 500 }}>Contact Person</span>}
                    dependencies={['email']}
                    rules={[contactValidator]}
                  >
                    <Input size="large" placeholder="E.g., John Smith" />
                  </Form.Item>
                </Col>

                <Col xs={24} md={8}>
                  <Form.Item
                    name="email"
                    label={<span style={{ fontWeight: 500 }}>Contact Email</span>}
                    dependencies={['contactPerson']}
                    rules={[
                      { type: "email", message: "Please enter a valid email address" },
                      contactValidator
                    ]}
                  >
                    <Input size="large" placeholder="contact@company.com" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24} style={{ marginTop: 16 }}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="contactNumber"
                    label={<span style={{ fontWeight: 500 }}>Contact Number</span>}
                    rules={[
                      { pattern: /^[0-9]*$/, message: "Please enter only digits" },
                      { len: 10, message: "Contact number must be exactly 10 digits" }
                    ]}
                  >
                    <Input
                      size="large"
                      placeholder="E.g., 9876543210"
                      maxLength={10}
                      onKeyPress={(e) => {
                        if (!/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* Section 2: Features Selection */}
            <Card
              variant="borderless"
              style={{
                borderRadius: 16,
                marginBottom: 24,
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                border: "1px solid #f0f0f0"
              }}
              styles={{ body: { padding: "16px 12px" } }}
            >
              <div id="application-features" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#fdf2f8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#db2777"
                }}>
                  <AppstoreOutlined />
                </div>
                <Title level={4} style={{ margin: 0 }}>Application Features <span style={{ color: '#ef4444', fontSize: 14, fontWeight: 400 }}>* (Select at least one)</span></Title>
              </div>

              <Text type="secondary" style={{ display: "block", marginBottom: 24, paddingLeft: 48 }}>
                Check all the required features and modules for the application.
              </Text>

              <Row gutter={[8, 8]}>
                {FEATURES.map((feat) => (
                  <Col xs={12} sm={12} md={8} xl={6} key={feat.key}>
                    <Form.Item name={feat.key} valuePropName="checked" style={{ margin: 0 }}>
                      <FeatureItem
                        label={feat.label}
                        description={feat.description}
                        icon={feat.icon}
                      />
                    </Form.Item>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* Section 3: Delivery Details & Scope Specifications */}
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

            {/* Section 4: Deep Specifications & Requirements */}
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
                  background: "#f0fdf4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#16a34a"
                }}>
                  <FileTextOutlined />
                </div>
                <Title level={4} style={{ margin: 0 }}>Requirements & Use Cases</Title>
              </div>

              <Form.Item
                name="useCase"
                label={<span style={{ fontWeight: 500 }}>Use Case & Core Objective</span>}
                style={{ marginBottom: 20 }}
              >
                <TextArea rows={3} placeholder="Describe the business problem, target audience, and primary workflow objectives..." size="large" style={{ borderRadius: 12 }} />
              </Form.Item>

              <Form.Item
                name="targetUsers"
                label={<span style={{ fontWeight: 500 }}>Target User Personas</span>}
                style={{ marginBottom: 20 }}
              >
                <TextArea rows={2} placeholder="e.g., Warehouse staff, administrators, third-party delivery agents..." size="large" style={{ borderRadius: 12 }} />
              </Form.Item>

              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="functionalRequirements"
                    label={<span style={{ fontWeight: 500 }}>Functional Requirements</span>}
                  >
                    <TextArea rows={4} placeholder="List explicit user actions (e.g. login, payment gateway, tracking...)" size="large" style={{ borderRadius: 12 }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="nonFunctionalRequirements"
                    label={<span style={{ fontWeight: 500 }}>Non-Functional Requirements</span>}
                  >
                    <TextArea rows={4} placeholder="Performance metrics, speed constraints, security requirements..." size="large" style={{ borderRadius: 12 }} />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={24} style={{ marginTop: 12 }}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="budget"
                    label={<span style={{ fontWeight: 500 }}>Budget Constraint</span>}
                  >
                    <Input placeholder="e.g. $20,000 - $30,000" size="large" style={{ borderRadius: 12 }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="integrations"
                    label={<span style={{ fontWeight: 500 }}>System Integrations</span>}
                  >
                    <Input placeholder="e.g. Razorpay, SendGrid, SAP ERP, OAuth" size="large" style={{ borderRadius: 12 }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="extraAddOns"
                label={<span style={{ fontWeight: 500 }}>Extra Deliverables & Scope Add-ons</span>}
                style={{ marginTop: 12 }}
              >
                <TextArea rows={2} placeholder="Any details not captured by the above fields..." size="large" style={{ borderRadius: 12 }} />
              </Form.Item>
            </Card>

            {/* Section 5: Attachments */}
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
