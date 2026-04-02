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
  Checkbox
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
  IdcardOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  VideoCameraOutlined,
  SecurityScanOutlined,
  CloudOutlined,
  DisconnectOutlined,
  HddOutlined
} from "@ant-design/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";

const { Title, Text } = Typography;
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
    description: "Active Intenet",
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
        padding: "16px 20px",
        borderRadius: 12,
        border: `1.5px solid ${isSelected ? PRIMARY_COLOR : "#f3f4f6"}`,
        background: isSelected ? "#f0fdfa" : "#fff",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        gap: 16,
        boxShadow: isSelected ? "0 4px 12px rgba(0, 137, 123, 0.12)" : "none",
        height: "100%",
        minHeight: 70,
        position: "relative",
        overflow: "hidden"
      }}
      className="feature-item-hover"
    >
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        width: 20, 
        height: 20, 
        borderRadius: 4, 
        border: `1.5px solid ${isSelected ? PRIMARY_COLOR : "#d1d5db"}`,
        background: isSelected ? PRIMARY_COLOR : "transparent",
        transition: "all 0.2s ease"
      }}>
        {isSelected && <CheckOutlined style={{ color: "#fff", fontSize: 12 }} />}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ display: "block", fontSize: 14, color: isSelected ? "#111827" : "#374151" }}>
          {label}
        </Text>
        <Text type="secondary" style={{ fontSize: 11, display: "block", opacity: 0.8 }}>
          {description}
        </Text>
      </div>

      <div style={{ fontSize: 20, color: isSelected ? PRIMARY_COLOR : "#9ca3af", opacity: 0.6 }}>
        {icon}
      </div>

      <style jsx>{`
        .feature-item-hover:hover {
          border-color: ${isSelected ? PRIMARY_COLOR : "#99f6e4"};
          background: ${isSelected ? "#f0fdfa" : "#f0fdfa"};
        }
      `}</style>
    </div>
  );
};


export default function NewProjectPage() {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [mounting, setMounting] = useState(true);
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
      const response = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (response.ok) {
        message.success("Project created successfully!");
        router.push("/projects");
      } else {
        message.error(data.error || "Failed to create project");
      }
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
            Set up building the client details and select required application features.
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
            }}
          >
          {/* Section 1: Client Details */}
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
              <Title level={4} style={{ margin: 0 }}>Client Information</Title>
            </div>

            <Row gutter={24}>
              <Col xs={24} md={6}>
                <Form.Item
                  name="companyName"
                  label={<span style={{ fontWeight: 500 }}>Company Name</span>}
                  rules={[{ required: true, message: "Please enter the company name" }]}
                >
                  <Input size="large" placeholder="E.g., Global Tech Inc." />
                </Form.Item>
              </Col>
              
              <Col xs={24} md={6}>
                <Form.Item
                  name="contactPerson"
                  label={<span style={{ fontWeight: 500 }}>Contact Person</span>}
                  dependencies={['email']}
                  rules={[contactValidator]}
                >
                  <Input size="large" placeholder="E.g., John Smith" />
                </Form.Item>
              </Col>
              
              <Col xs={24} md={6}>
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

              <Col xs={24} md={6}>
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
            styles={{ body: { padding: "24px 32px" } }}
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
            
            <Row gutter={[12, 12]}>
              {FEATURES.map((feat) => (
                <Col xs={24} sm={12} md={8} xl={6} key={feat.key}>
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

          {/* Section 3: Delivery Details */}
          <Card 
            variant="borderless" 
            style={{ 
              borderRadius: 16, 
              marginBottom: 32, 
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
              <Title level={4} style={{ margin: 0 }}>Project Roadmap</Title>
            </div>
            
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="timeline"
                  label={<span style={{ fontWeight: 500 }}>Target Timeline</span>}
                  rules={[{ required: true, message: "Please define the project duration" }]}
                >
                  <RangePicker size="large" style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider style={{ margin: "16px 0 24px" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
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
              <span style={{ fontWeight: 600, fontSize: 16, color: "#374151" }}>Additional Requirements</span>
            </div>

            <Form.Item
              name="extraAddOns"
              noStyle
            >
              <TextArea 
                rows={4} 
                placeholder="Mention any custom integrations like payment gateways, email services, or special security requirements..." 
                size="large"
                style={{ borderRadius: 12 }}
              />
            </Form.Item>
          </Card>

          {/* Footer Actions */}
          <div className="footer-actions">
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              loading={submitting} 
              className="action-btn primary"
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
