"use client";

import React, { useState } from "react";
import { Alert, Button, Card, Typography, Form, Input } from "antd";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { User, Lock, ArrowRight } from "lucide-react";
import logo from "../../../../public/Biometrik_New_Logo.png";

const { Title, Text } = Typography;

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: values.username.trim(),
          password: values.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Invalid username or password.");
        return;
      }

      // Check callback URL if provided
      const callbackUrl = searchParams ? searchParams.get("callbackUrl") : null;
      const targetPath = callbackUrl && !callbackUrl.startsWith("/auth") ? callbackUrl : data.redirect || "/dashboard";

      window.location.href = targetPath;
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      style={{
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        borderRadius: 16,
        padding: "16px 12px",
        background: "#ffffff",
      }}
      variant="borderless"
    >
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <Image
          src={logo}
          alt="Biometrik Logo"
          width={200}
          height={50}
          priority
          unoptimized
          style={{
            display: "block",
            margin: "0 auto 16px",
            width: "190px",
            height: "auto",
            objectFit: "contain",
          }}
        />
        <Title level={4} style={{ margin: "0 0 6px 0", color: "#1f1f1f", fontWeight: 600 }}>
          Employee Portal Login
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Enter your authorized username and password to sign in.
        </Text>
      </div>

      {errorMessage && (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          style={{
            marginBottom: 20,
            borderRadius: 8,
            fontSize: 13,
            lineHeight: "1.5",
          }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleLogin}
        requiredMark={false}
      >
        <Form.Item
          name="username"
          label={<Text strong style={{ fontSize: 13, color: "#434343" }}>Username or Email</Text>}
          rules={[{ required: true, message: "Please enter your username or email" }]}
        >
          <Input
            size="large"
            placeholder="e.g. admin or username"
            prefix={<User size={18} style={{ color: "#8c8c8c", marginRight: 8 }} />}
            style={{ borderRadius: 8, height: 46 }}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<Text strong style={{ fontSize: 13, color: "#434343" }}>Password</Text>}
          rules={[{ required: true, message: "Please enter your password" }]}
        >
          <Input.Password
            size="large"
            placeholder="••••••••"
            prefix={<Lock size={18} style={{ color: "#8c8c8c", marginRight: 8 }} />}
            style={{ borderRadius: 8, height: 46 }}
          />
        </Form.Item>

        <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
          <Button
            type="primary"
            htmlType="submit"
            block
            size="large"
            loading={loading}
            icon={<ArrowRight size={18} />}
            iconPosition="end"
            style={{
              height: 48,
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: "#00897b",
              borderColor: "#00897b",
              boxShadow: "0 4px 12px rgba(0, 137, 123, 0.25)",
            }}
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Text type="secondary" style={{ fontStyle: "italic", fontSize: 12 }}>
          &quot;There are no traffic jams at the extra mile !&quot;
        </Text>
      </div>
    </Card>
  );
}
