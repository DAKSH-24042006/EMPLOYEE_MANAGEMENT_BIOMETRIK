"use client";

import React, { useRef, useCallback, useState, useEffect } from "react";
import Webcam from "react-webcam";
import { Button, Spin, Alert } from "antd";
import { CheckCircleOutlined, CameraOutlined } from "@ant-design/icons";

interface WebcamCaptureProps {
  email: string;
  onSuccess: (response: any) => void;
  onBack: () => void;
}

export default function WebcamCapture({ email, onSuccess, onBack }: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isLivenessVerified, setIsLivenessVerified] = useState(false);
  const [isLivenessChecking, setIsLivenessChecking] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

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
          setIsLivenessChecking(false);
          setErrorMessage(null);
        }
      } catch (error) {
        console.error("Liveness check error", error);
        // We do not show an error immediately on polling failure to avoid spamming the user
      }
    };

    if (!isLivenessVerified) {
      intervalId = setInterval(checkLiveness, 2000); // Check every 2 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLivenessVerified]);

  const handleCaptureAndLogin = useCallback(async () => {
    if (!webcamRef.current) return;

    setIsAuthenticating(true);
    setErrorMessage(null);

    const imageSrc = webcamRef.current.getScreenshot();

    if (!imageSrc) {
      setErrorMessage("Failed to capture image.");
      setIsAuthenticating(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/verify-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          image: imageSrc,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess(data);
      } else {
        setErrorMessage(data.error || "Authentication failed.");
      }
    } catch (error) {
      setErrorMessage("Failed to connect to authentication server.");
    } finally {
      setIsAuthenticating(false);
    }
  }, [email, onSuccess]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
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
            <CheckCircleOutlined /> Liveness verified! You may now authenticate.
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
        <Alert type="error" message={errorMessage} showIcon style={{ borderRadius: "8px" }} />
      )}

      <Button
        type="primary"
        size="large"
        disabled={!isLivenessVerified}
        loading={isAuthenticating}
        onClick={handleCaptureAndLogin}
        icon={<CameraOutlined />}
        style={{
          height: 48,
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          backgroundColor: isLivenessVerified ? "#00897b" : undefined,
          borderColor: isLivenessVerified ? "#00897b" : undefined,
        }}
      >
        Capture & Login
      </Button>

      <Button type="link" onClick={onBack} style={{ marginTop: "8px" }}>
        Back to Email
      </Button>
    </div>
  );
}
