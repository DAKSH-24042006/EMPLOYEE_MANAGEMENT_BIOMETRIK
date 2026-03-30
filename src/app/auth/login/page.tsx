"use client";

import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, App } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useRouter, useSearchParams } from "next/navigation";

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        message.success("Login successful!");
        router.push(callbackUrl);
        router.refresh();
      } else {
        message.error(data.error || "Login failed");
      }
    } catch (error) {
      message.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f2f5"
    }}>
      <Card
        style={{
          width: "100%",
          maxWidth: 400,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          borderRadius: 12
        }}
        variant="borderless"
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            backgroundColor: "#0073ea",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <span style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}>M</span>
          </div>
          <Title level={3} style={{ margin: 0 }}>Welcome Back</Title>
          <Text type="secondary">Enter your credentials to access your workspace</Text>
        </div>

        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" }
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: "rgba(0,0,0,.25)" }} />} placeholder="Email address" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password!" }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: "rgba(0,0,0,.25)" }} />} placeholder="Password" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16, marginTop: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, borderRadius: 8, fontWeight: 500 }}
            >
              Sign In
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: "center" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Demo Hint: Use any email and password. "sales" in email logs you in as SALES_TEAM, otherwise ADMIN.
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
