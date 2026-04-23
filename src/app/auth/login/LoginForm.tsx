"use client";

import React, { useState } from "react";
import { Alert, Button, Card, Form, Input, Space, Typography, App } from "antd";
import { MailOutlined } from "@ant-design/icons";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import FaceCapture from "@/components/auth/FaceCapture";
import logo from "../../../../public/Biometrik_New_Logo.png";

const { Title, Text } = Typography;

type LoginStep = "enter-email" | "register-face" | "verify-face";

function getCurrentLocation() {
  return new Promise<string>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not supported in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(`Lat: ${latitude}, Lng: ${longitude}`);
      },
      () => reject(new Error("Location permission is required to register your face.")),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
}

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>("enter-email");
  const [email, setEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const safeCallbackUrl = callbackUrl.startsWith("/") && !callbackUrl.startsWith("/.well-known/")
    ? callbackUrl
    : "/dashboard";

  const checkEmail = async (values: { email: string }) => {
    const normalizedEmail = values.email.trim().toLowerCase();
    setLoading(true);
    setStatusMessage("");

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        message.error(data.error || "Unable to check account");
        return;
      }

      if (!data.exists) {
        setStatusMessage("This email is not registered. Please contact the admin.");
        return;
      }

      setEmail(normalizedEmail);

      if (data.nextStep === "register-face") {
        setStep("register-face");
        setStatusMessage("Face registration is required for this account.");
      } else {
        setStep("verify-face");
      }
    } catch (error) {
      message.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitFace = async (faceImage: string) => {
    const endpoint = step === "register-face"
      ? "/api/auth/register-face"
      : "/api/auth/face-verify";

    setLoading(true);

    try {
      const location = step === "register-face"
        ? await getCurrentLocation()
        : undefined;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, faceImage, location }),
      });

      const data = await res.json();

      if (res.ok) {
        message.success(step === "register-face" ? "Face registered successfully!" : "Login successful!");
        window.location.href = safeCallbackUrl;
        return;
      }

      message.error(data.error || "Face authentication failed");

      if (data.nextStep === "register-face") {
        setStep("register-face");
        setStatusMessage("Face registration is required for this account.");
      }
    } catch (error: any) {
      message.error(error.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetEmail = () => {
    setStep("enter-email");
    setEmail("");
    setStatusMessage("");
  };

  return (
    <Card
      style={{
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
        borderRadius: 12,
      }}
      variant="borderless"
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Image
          src={logo}
          alt="Logo"
          width={180}
          height={45}
          unoptimized
          style={{
            display: "block",
            margin: "0 auto 15px",
            width: "180px",
            height: "auto",
            objectFit: "contain",
          }}
        />
        <Title level={3} style={{ margin: 0, marginBottom: 10 }}>
          Welcome Back
        </Title>
        <Text type="secondary">
          Use your registered email and face verification to continue.
        </Text>
      </div>

      {statusMessage && (
        <Alert
          type={step === "enter-email" ? "warning" : "info"}
          showIcon
          title={statusMessage}
          style={{ marginBottom: 20 }}
        />
      )}

      {step === "enter-email" ? (
        <Form
          name="face_login_email_form"
          layout="vertical"
          onFinish={checkEmail}
          requiredMark={false}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              placeholder="Email address"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16, marginTop: 32 }}>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{ height: 44, borderRadius: 8, fontWeight: 500 }}
            >
              Continue
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <Space orientation="vertical" style={{ width: "100%" }} size={16}>
          <div>
            <Text type="secondary">Account</Text>
            <div style={{ fontWeight: 600, color: "#323338" }}>{email}</div>
          </div>

          <FaceCapture
            loading={loading}
            actionLabel={step === "register-face" ? "Register Face" : "Verify Face"}
            helperText={
              step === "register-face"
                ? "Camera and location permission are required. Your current location will be saved with this face registration."
                : "Center your face clearly and capture to sign in."
            }
            onCapture={submitFace}
          />

          <Button block onClick={resetEmail} disabled={loading} style={{ borderRadius: 8 }}>
            Use Different Email
          </Button>
        </Space>
      )}

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Text type="secondary" style={{ fontStyle: "italic", fontSize: 13 }}>
          "There are no traffic jams at the extra mile !"
        </Text>
      </div>
    </Card>
  );
}
