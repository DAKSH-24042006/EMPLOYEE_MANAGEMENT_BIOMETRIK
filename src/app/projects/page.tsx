"use client";

import React from "react";
import { Typography, Card, Breadcrumb } from "antd";

const { Title, Text } = Typography;

export default function ProjectsPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>Projects</Title>
        <Text type="secondary">Manage and track your active marketing projects.</Text>
      </div>
      <Card variant="borderless" style={{ background: "#f9fafb", textAlign: "center", padding: "48px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
        <Title level={4}>Projects Dashboard</Title>
        <Text type="secondary">This page is under development. Soon you'll be able to see all your active and archived projects here.</Text>
      </Card>
    </div>
  );
}
