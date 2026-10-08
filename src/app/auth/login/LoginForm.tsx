"use client";

import React, { useState } from "react";
import { Alert, Button, Card, Typography, Form, Input } from "antd";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { User, Lock, ArrowRight } from "lucide-react";
import logo from "../../../../public/Biometrik_New_Logo.png";
import WebcamCapture from "../../../components/WebcamCapture";

const { Title, Text } = Typography;

export default function LoginForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFaceRegistered, setIsFaceRegistered] = useState<boolean>(false);
  const [isCheckingUser, setIsCheckingUser] = useState<boolean>(false);
  const [form] = Form.useForm();
  const searchParams = useSearchParams();

  const handleNext = async (values: { username: string }) => {
    const trimmedEmail = values.username.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter an email or username.");
      return;
    }

    setIsCheckingUser(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `/api/auth/face-status?identifier=${encodeURIComponent(trimmedEmail)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Account not found for this email.");
        return;
      }

      setEmail(trimmedEmail);
      setIsFaceRegistered(!!data.isFaceRegistered);
      setStep(2);
    } catch (err) {
      setErrorMessage("Failed to check account. Please try again.");
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleSuccess = (data: any) => {
    // Check callback URL if provided
    const callbackUrl = searchParams ? searchParams.get("callbackUrl") : null;
    const targetPath =
      callbackUrl && !callbackUrl.startsWith("/auth") ? callbackUrl : data.redirect || "/dashboard";

    window.location.href = targetPath;
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
        <Text
          style={{
            display: "block",
            fontSize: "15px",
            color: "#1f1f1f",
            fontWeight: 500,
            marginBottom: "8px",
          }}
        >
          kramik-portal
        </Text>
        <Text type="secondary" style={{ fontSize: 13 }}>
          {step === 1 ? "Enter your email to verify identity." : "Face Authentication"}
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

      {step === 1 && (
        <Form form={form} layout="vertical" onFinish={handleNext} requiredMark={false}>
          <Form.Item
            name="username"
            label={
              <Text strong style={{ fontSize: 13, color: "#434343" }}>
                Email
              </Text>
            }
            rules={[{ required: true, message: "Please enter your email" }]}
          >
            <Input
              size="large"
              placeholder="e.g. admin@biometrik.com"
              prefix={<User size={18} style={{ color: "#8c8c8c", marginRight: 8 }} />}
              style={{ borderRadius: 8, height: 46 }}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 24, marginBottom: 12 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={isCheckingUser}
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
              Next
            </Button>
          </Form.Item>
        </Form>
      )}

      {step === 2 && (
        <WebcamCapture
          email={email}
          isFaceRegistered={isFaceRegistered}
          onSuccess={handleSuccess}
          onBack={() => {
            setStep(1);
            setErrorMessage(null);
          }}
        />
      )}

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <Text type="secondary" style={{ fontStyle: "italic", fontSize: 12 }}></Text>
      </div>
    </Card>
  );
}
