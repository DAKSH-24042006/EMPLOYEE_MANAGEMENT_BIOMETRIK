"use client";

import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { Button, Spin, Alert, Typography } from "antd";
import { CheckCircleOutlined, CameraOutlined, UserAddOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface WebcamCaptureProps {
  email: string;
  isFaceRegistered?: boolean;
  onSuccess: (response: any) => void;
  onBack: () => void;
}

export default function WebcamCapture({
  email,
  isFaceRegistered = false,
  onSuccess,
  onBack,
}: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [registeredMode, setRegisteredMode] = useState(isFaceRegistered);
  const [isLivenessVerified, setIsLivenessVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    setRegisteredMode(isFaceRegistered);
  }, [isFaceRegistered]);

  // Poll for liveness
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkLiveness = async () => {
      if (isLivenessVerified || !webcamRef.current) return;

      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;

      try {
        const response = await fetch("/api/auth/liveness", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: imageSrc }),
        });

        const data = await response.json();

        if (response.ok && data.verified) {
          setIsLivenessVerified(true);
          setErrorMessage(null);
        }
      } catch (error) {
        console.error("Liveness check error", error);
      }
    };

    if (!isLivenessVerified) {
      intervalId = setInterval(checkLiveness, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLivenessVerified]);

  const handleAction = async () => {
    if (!webcamRef.current) return;

    setIsAuthenticating(true);
    setErrorMessage(null);

    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) {
      setErrorMessage("Failed to capture image from camera.");
      setIsAuthenticating(false);
      return;
    }

    try {
      // Flow 1: If in registration mode (new user or user re-registering their face)
      if (!registeredMode) {
        const regRes = await fetch("/api/auth/register-face", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            image: imageSrc,
          }),
        });

        const regData = await regRes.json();

        if (!regRes.ok) {
          setErrorMessage(regData.error || "Failed to register face.");
          setIsAuthenticating(false);
          return;
        }
      }

      // Flow 2: Perform 1:1 Face Match Verification
      const verifyRes = await fetch("/api/auth/verify-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          image: imageSrc,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok) {
        onSuccess(verifyData);
      } else {
        setErrorMessage(verifyData.error || "Face authentication failed. Face does not match.");
      }
    } catch (error) {
      setErrorMessage("Failed to connect to authentication server.");
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ textAlign: "center", marginBottom: "4px" }}>
        <Text strong style={{ fontSize: 15, color: "#262626" }}>
          {registeredMode ? "Face Authentication" : "Face Registration"}
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: 13 }}>
          {registeredMode
            ? `Logging in as ${email}`
            : `Setup face biometric for ${email}. Look at camera to register.`}
        </Text>
      </div>

      <div
        style={{
          position: "relative",
          borderRadius: "8px",
          overflow: "hidden",
          border: "1px solid #d9d9d9",
        }}
      >
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            facingMode: "user",
          }}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
        {isLivenessVerified && (
          <div
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              background: "white",
              borderRadius: "50%",
              padding: "2px",
            }}
          >
            <CheckCircleOutlined style={{ fontSize: "24px", color: "#52c41a" }} />
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", minHeight: "24px" }}>
        {isLivenessVerified ? (
          <span
            style={{
              color: "#52c41a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            <CheckCircleOutlined /> Liveness verified! You may now proceed.
          </span>
        ) : (
          <span
            style={{
              color: "#8c8c8c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              fontSize: "14px",
            }}
          >
            <Spin size="small" /> Checking liveness, please look at the camera...
          </span>
        )}
      </div>

      {errorMessage && (
        <Alert type="error" description={errorMessage} showIcon style={{ borderRadius: "8px" }} />
      )}

      {/* SINGLE PRIMARY ACTION BUTTON */}
      <Button
        type="primary"
        size="large"
        disabled={!isLivenessVerified}
        loading={isAuthenticating}
        onClick={handleAction}
        icon={registeredMode ? <CameraOutlined /> : <UserAddOutlined />}
        style={{
          height: 48,
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          backgroundColor: isLivenessVerified ? "#00897b" : undefined,
          borderColor: isLivenessVerified ? "#00897b" : undefined,
        }}
      >
        {registeredMode ? "Capture & Login" : "Capture & Register Face"}
      </Button>

      <Button type="link" onClick={onBack} style={{ marginTop: "4px" }}>
        Back to Email
      </Button>
    </div>
  );
}
