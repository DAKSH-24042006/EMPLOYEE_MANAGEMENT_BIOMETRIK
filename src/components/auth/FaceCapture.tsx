"use client";

import React, { useRef, useState, useCallback } from "react";
import { Alert, Button, Space, Typography } from "antd";
import { Camera, RefreshCcw } from "lucide-react";
import Webcam from "react-webcam";

const { Text } = Typography;

interface FaceCaptureProps {
  loading?: boolean;
  actionLabel: string;
  helperText?: string;
  onCapture: (faceImage: string) => void;
}

const videoConstraints = {
  width: 1280,
  height: 720,
  facingMode: "user",
};

export default function FaceCapture({
  loading = false,
  actionLabel,
  helperText,
  onCapture,
}: FaceCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const [error, setError] = useState("");

  const handleUserMedia = useCallback(() => {
    setCameraReady(true);
    setError("");
  }, []);

  const handleUserMediaError = useCallback((err: string | DOMException) => {
    console.error("[FaceCapture] Camera Error:", err);
    setCameraReady(false);
    
    const errorName = typeof err === 'string' ? err : err.name;
    
    if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
      setError("Camera permission denied. Please allow camera access and use HTTPS for mobile testing.");
    } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
      setError("No camera found on this device.");
    } else {
      setError("Could not start camera. Ensure you are using HTTPS or localhost.");
    }
  }, []);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    } else {
      setError("Unable to capture image from camera.");
    }
  }, [onCapture]);

  const restartCamera = () => {
    setCameraKey(prev => prev + 1);
    setCameraReady(false);
    setError("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {helperText && <Text type="secondary">{helperText}</Text>}

      {error && !cameraReady && (
        <Alert
          type="error"
          showIcon
          title={error}
          description={
            error.toLowerCase().includes("permission") 
              ? "To fix this, click the camera/lock icon in your browser address bar and change 'Blocked' to 'Allow', then click Restart Camera."
              : undefined
          }
        />
      )}

      <div
        style={{
          width: "100%",
          aspectRatio: "4 / 3",
          background: "#111827",
          borderRadius: 8,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        <Webcam
          key={cameraKey}
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={videoConstraints}
          onUserMedia={handleUserMedia}
          onUserMediaError={handleUserMediaError}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: cameraReady ? "block" : "none",
          }}
        />
        {!cameraReady && !error && (
          <Text style={{ color: "white" }}>
            Starting camera...
          </Text>
        )}
        {!cameraReady && error && (
          <div style={{ padding: 20, textAlign: 'center' }}>
             <Text style={{ color: "white" }}>Camera unavailable</Text>
          </div>
        )}
      </div>

      <Space orientation="vertical" style={{ width: "100%" }}>
        <Button
          type="primary"
          block
          size="large"
          icon={<Camera size={16} />}
          onClick={capture}
          loading={loading}
          disabled={!cameraReady}
          style={{ height: 44, borderRadius: 8, fontWeight: 500 }}
        >
          {actionLabel}
        </Button>
        <Button
          block
          icon={<RefreshCcw size={16} />}
          onClick={restartCamera}
          disabled={loading}
          style={{ borderRadius: 8 }}
        >
          Restart Camera
        </Button>
      </Space>
    </div>
  );
}

