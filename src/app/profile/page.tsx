"use client";

import React, { useState } from "react";
import { Typography, Card, Avatar, Row, Col, Divider, Button, Modal, Form, Input, message } from "antd";
import { User, Mail, Phone, MapPin, Lock, KeyRound } from "lucide-react";

const { Title, Text } = Typography;

export default function ProfilePage() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ 
    name: string; 
    email: string; 
    role: string; 
    phoneNumber?: string; 
    location?: string; 
  } | null>(null);
  const [form] = Form.useForm();

  React.useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success("Password changed successfully!");
        setIsModalVisible(false);
        form.resetFields();
      } else {
        message.error(data.error || "Failed to change password");
      }
    } catch (error) {
      console.error("Change password error:", error);
      message.error("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>My Profile</Title>
          <Text type="secondary">Manage your personal information and preferences.</Text>
        </div>
        <Button
          type="primary"
          icon={<Lock size={16} />}
          style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
          onClick={showModal}
        >
          Change Password
        </Button>
      </div>

      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ textAlign: "center", padding: "24px 0", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Avatar size={100} style={{ backgroundColor: "#00897b", color: "#fff", fontSize: "32px", fontWeight: 600, marginBottom: 16 }}>
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Avatar>
            <Title level={4} style={{ marginBottom: 4 }}>{user?.name || "Loading..."}</Title>
            <Text type="secondary" style={{ textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px", color: "#00897b", fontWeight: 600 }}>
              {user?.role?.replace("_", " ") || "USER"}
            </Text>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card variant="borderless" title="Personal Details" style={{ borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ backgroundColor: "#f0fdfa", padding: "8px", borderRadius: "8px" }}>
                  <Mail size={18} color="#00897b" />
                </div>
                <div>
                  <Text type="secondary" style={{ display: "block", fontSize: "12px" }}>Email Address</Text>
                  <Text strong>{user?.email || "..."}</Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ backgroundColor: "#f0fdfa", padding: "8px", borderRadius: "8px" }}>
                  <Phone size={18} color="#00897b" />
                </div>
                <div>
                  <Text type="secondary" style={{ display: "block", fontSize: "12px" }}>Phone Number</Text>
                  <Text strong>{user?.phoneNumber || "Not provided"}</Text>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ backgroundColor: "#f0fdfa", padding: "8px", borderRadius: "8px" }}>
                  <MapPin size={18} color="#00897b" />
                </div>
                <div>
                  <Text type="secondary" style={{ display: "block", fontSize: "12px" }}>Location</Text>
                  <Text strong>{user?.location || "Not provided"}</Text>
                </div>
              </div>
            </div>
            <Divider />
            {/* <Title level={5} style={{ display: "flex", alignItems: "center", gap: 8, color: "#00897b" }}>
              <User size={18} /> Bio
            </Title>
            <Text style={{ fontSize: "14px", lineHeight: "1.6", color: "#4b5563" }}>
              Lead administrator for Biometrik Systems requirement dashboard, managing end-to-end client requirements and data pipelines.
            </Text> */}
          </Card>
        </Col>
      </Row>

      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10 }}>
            <div style={{ backgroundColor: "#f0fdfa", padding: "8px", borderRadius: "8px" }}>
              <KeyRound size={20} color="#00897b" />
            </div>
            <span>Change Password</span>
          </div>
        }
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        centered
        width={400}
        styles={{ body: { paddingTop: 16 } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
        >
          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: "Please enter your current password" }]}
          >
            <Input.Password placeholder="Enter current password" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: "Please enter your new password" },
              { min: 8, message: "Password must be at least 8 characters long" }
            ]}
          >
            <Input.Password placeholder="Enter new password" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "Please confirm your new password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("The two passwords do not match!"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm new password" />
          </Form.Item>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
            >
              Update Password
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
