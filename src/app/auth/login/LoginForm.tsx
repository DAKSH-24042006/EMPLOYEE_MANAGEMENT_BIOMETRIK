"use client";

import React, { useState } from "react";
import { Form, Input, Button, Card, Typography, App } from "antd";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import logo from '../../../../public/Biometrik_New_Logo.png'

const { Title, Text } = Typography;

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Ensure cookies are sent and received
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (res.ok) {
        message.success("Login successful!");
        // Use window.location for a full page reload to ensure cookie is recognized
        window.location.href = "/dashboard";
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
        <Image
          src={logo}
          alt="Logo"
          width={180}
          height={150}
          unoptimized
          className="object-contain"
          style={{
            display: "block",
            margin: "0 auto 15px"
          }}
        />
        <Title level={3} style={{ margin: 0, marginBottom: 10 }}>Welcome Back</Title>
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
          <Text type="secondary" style={{ fontStyle: "italic", fontSize: 13 }}>
            "There are no traffic jams at the extra mile !"
          </Text>
        </div>
      </Form>
    </Card>
  );
}
