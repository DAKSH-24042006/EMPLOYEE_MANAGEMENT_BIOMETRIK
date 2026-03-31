"use client";

import React from "react";
import { Typography, Card, Calendar } from "antd";

const { Title, Text } = Typography;

export default function CalendarPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>Calendar</Title>
        <Text type="secondary">View and schedule your requirement events.</Text>
      </div>
      <Card variant="borderless" style={{ padding: 24 }}>
        <Calendar fullscreen={false} />
      </Card>
    </div>
  );
}
