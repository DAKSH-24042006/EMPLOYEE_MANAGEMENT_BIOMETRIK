"use client";

import React, { useEffect, useState } from "react";
import { Typography, Card, List, Button, Space, Badge, Tag, message } from "antd";
import { Bell, Check, ArrowRight, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dayjs from "dayjs";

const { Title, Text } = Typography;

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (res.ok) {
        setNotifications(json.data);
      }
    } catch (err) {
      message.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, projectId?: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        if (projectId) {
          router.push(`/projects/${projectId}?tab=chat`);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        message.success("All notifications marked as read");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeTagColor = (type: string) => {
    switch (type) {
      case "TASK_OVERDUE":
      case "BLOCKER_OVERDUE":
        return "red";
      case "BLOCKER_ADDED":
        return "volcano";
      case "BLOCKER_RESOLVED":
        return "green";
      case "CHAT_MENTION":
      case "CHAT_CLARIFICATION":
        return "purple";
      case "TASK_ASSIGNED":
        return "blue";
      default:
        return "default";
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", paddingBottom: 50 }}>
      <div
        style={{
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            All Notifications
          </Title>
          <Text type="secondary">View and manage your alerts and timeline updates.</Text>
        </div>
        <Button
          type="primary"
          onClick={handleMarkAllAsRead}
          disabled={unreadCount === 0}
          style={{ backgroundColor: "#00897b", border: "none" }}
        >
          Mark all as read
        </Button>
      </div>

      <Card
        variant="borderless"
        style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
      >
        <List
          loading={loading}
          dataSource={notifications}
          locale={{ emptyText: "No notifications found" }}
          renderItem={(item) => (
            <List.Item
              style={{
                padding: "20px 24px",
                cursor: "pointer",
                backgroundColor: item.read ? "transparent" : "#f0f7ff",
                borderBottom: "1px solid #f0f0f0",
                transition: "background 0.3s",
                borderRadius: 8,
                marginBottom: 8,
              }}
              actions={[
                <Button
                  type="text"
                  icon={<ArrowRight size={16} />}
                  onClick={() => handleMarkAsRead(item._id, item.projectId)}
                >
                  View Project
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Badge dot={!item.read}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        backgroundColor: item.read ? "#f5f5f5" : "#e6f7ff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Bell size={18} color={item.read ? "#8c8c8c" : "#1890ff"} />
                    </div>
                  </Badge>
                }
                title={
                  <Space size={8}>
                    <span style={{ fontWeight: item.read ? 500 : 700, fontSize: 15 }}>
                      {item.title}
                    </span>
                    <Tag color={getTypeTagColor(item.type)} style={{ fontSize: 10 }}>
                      {item.type.replace("_", " ")}
                    </Tag>
                  </Space>
                }
                description={
                  <Space orientation="vertical" size={4} style={{ width: "100%", marginTop: 4 }}>
                    <Text style={{ color: "#434343" }}>{item.message}</Text>
                    <Space size={4} style={{ fontSize: 11, color: "#bfbfbf" }}>
                      <Calendar size={12} />
                      <span>{dayjs(item.createdAt).format("MMM DD, YYYY h:mm A")}</span>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
}
