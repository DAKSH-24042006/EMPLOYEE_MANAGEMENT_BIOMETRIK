"use client";

import React, { useState, useEffect, Suspense } from "react";
import { Typography, Card, Avatar, Row, Col, Divider, Button, Modal, Form, Input, message, Grid, Tag, Space } from "antd";
import { User, Mail, Phone, MapPin, Lock, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

const { Title, Text } = Typography;

function ProfileContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const screens = Grid.useBreakpoint();
  const [mounted, setMounted] = useState(false);

  // Edit Profile states
  const [editProfileForm] = Form.useForm();
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [profileUpdating, setProfileUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchUserData();
  }, []);

  const isMobile = mounted && !screens.md;

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

  const showEditModal = () => {
    if (user) {
      editProfileForm.setFieldsValue({
        name: user.name,
        phoneNumber: user.phoneNumber || "",
        location: user.location || "",
      });
    }
    setIsEditModalVisible(true);
  };

  const handleEditCancel = () => {
    setIsEditModalVisible(false);
    editProfileForm.resetFields();
  };

  const onUpdateProfile = async (values: any) => {
    setProfileUpdating(true);
    try {
      const response = await fetch("/api/user/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: values.name,
          phoneNumber: values.phoneNumber,
          location: values.location,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        message.success("Profile updated successfully!");
        setIsEditModalVisible(false);
        fetchUserData(); // Reload profile details
      } else {
        message.error(data.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      message.error("Something went wrong. Please try again later.");
    } finally {
      setProfileUpdating(false);
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", minWidth: 0, maxWidth: "100%" }}>
      <div style={{
        marginBottom: 24,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        justifyContent: "space-between",
        alignItems: isMobile ? "stretch" : "flex-end",
        gap: 16,
        flex: "0 0 auto"
      }}>
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>My Profile</Title>
          <Text type="secondary">Manage your personal information and preferences.</Text>
        </div>
        <Space size={12}>
          <Button
            icon={<User size={16} />}
            onClick={showEditModal}
            style={{
              height: 40,
              borderRadius: 8,
            }}
          >
            Edit Profile
          </Button>
          <Button
            type="primary"
            icon={<Lock size={16} />}
            style={{
              backgroundColor: "#00897b",
              borderColor: "#00897b",
              height: 40,
              borderRadius: 8,
              boxShadow: "0 4px 6px rgba(0, 137, 123, 0.2)"
            }}
            onClick={showModal}
          >
            Change Password
          </Button>
        </Space>
      </div>

      <div style={{ paddingRight: 8, overflowY: "auto", flex: "1 1 auto" }}>
        <Row gutter={isMobile ? [16, 16] : [24, 24]}>
          <Col xs={24} md={8}>
            <Card
              variant="borderless"
              style={{
                textAlign: "center",
                padding: isMobile ? "16px 0" : "24px 0",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                height: "100%"
              }}
            >
              <Avatar
                size={isMobile ? 80 : 100}
                style={{
                  backgroundColor: "#00897b",
                  color: "#fff",
                  fontSize: isMobile ? "24px" : "32px",
                  fontWeight: 600,
                  marginBottom: isMobile ? 12 : 16
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </Avatar>
              <Title level={4} style={{ marginBottom: 4, fontSize: isMobile ? 18 : 20 }}>{user?.name || "Loading..."}</Title>
              <Text type="secondary" style={{ textTransform: "uppercase", fontSize: isMobile ? "10px" : "12px", letterSpacing: "1px", color: "#00897b", fontWeight: 600 }}>
                {user?.role?.replace("_", " ") || "USER"}
              </Text>
            </Card>
          </Col>

          <Col xs={24} md={16}>
            <Space direction="vertical" size={24} style={{ width: "100%" }}>
              <Card variant="borderless" title="Personal Details" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Mail size={18} color="#676879" />
                    <Text>{user?.email}</Text>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Phone size={18} color="#676879" />
                    <Text>{user?.phoneNumber || "Not specified"}</Text>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <MapPin size={18} color="#676879" />
                    <Text>{user?.location || "Not specified"}</Text>
                  </div>
                </div>
                <Divider />
                <Title level={5}>Bio</Title>
                <Text>Lead {user?.role?.toLowerCase().replace("_", " ") || "user"} for Biometrik Systems requirement dashboard, managing end-to-end client requirements and data pipelines.</Text>
              </Card>
            </Space>
          </Col>
        </Row>
      </div>

      <Modal
        title="Edit Profile"
        open={isEditModalVisible}
        onCancel={handleEditCancel}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 12, overflow: "hidden" }}
      >
        <Form
          form={editProfileForm}
          layout="vertical"
          onFinish={onUpdateProfile}
          requiredMark={false}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: "Please enter your name" }]}
          >
            <Input placeholder="Enter your full name" />
          </Form.Item>

          <Form.Item
            name="phoneNumber"
            label="Phone Number"
            rules={[
              { required: true, message: "Please enter your phone number" },
              { pattern: /^[0-9]+$/, message: "Phone number must contain only digits" }
            ]}
          >
            <Input placeholder="Enter your phone number" />
          </Form.Item>

          <Form.Item
            name="location"
            label="Location"
          >
            <Input placeholder="Enter your location (e.g. Noida, Delhi)" />
          </Form.Item>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 24 }}>
            <Button onClick={handleEditCancel}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={profileUpdating}
              style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Change Password"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 12, overflow: "hidden" }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          style={{ marginTop: 16 }}
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

export default function ProfilePage() {
  return (
    <Suspense fallback={<div>Loading profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}
