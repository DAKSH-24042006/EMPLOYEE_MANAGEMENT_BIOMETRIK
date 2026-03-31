"use client";

import React from "react";
import { Typography, Card, Avatar, Row, Col, Divider } from "antd";
import { User, Mail, Phone, MapPin } from "lucide-react";

const { Title, Text } = Typography;

export default function ProfilePage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>My Profile</Title>
        <Text type="secondary">Manage your personal information and preferences.</Text>
      </div>
      <Row gutter={24}>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ textAlign: "center", padding: "24px 0" }}>
            <Avatar size={100} style={{ backgroundColor: "#ffcd00", color: "#333", fontSize: "32px", fontWeight: 600, marginBottom: 16 }}>
              SS
            </Avatar>
            <Title level={4} style={{ marginBottom: 4 }}>Shivai Systems</Title>
            <Text type="secondary">Administrator</Text>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card variant="borderless" title="Personal Details">
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Mail size={18} color="#676879" />
                <Text>shivai@biometrik.systems</Text>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Phone size={18} color="#676879" />
                <Text>+91 98765 43210</Text>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <MapPin size={18} color="#676879" />
                <Text>Mumbai, India</Text>
              </div>
            </div>
            <Divider />
            <Title level={5}>Bio</Title>
            <Text>Lead administrator for Biometrik Systems requirement dashboard, managing end-to-end client requirements and data pipelines.</Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
