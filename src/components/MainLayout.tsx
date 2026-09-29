"use client";

import React, { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Button,
  theme,
  Avatar,
  Dropdown,
  Breadcrumb,
  Space,
  Grid,
  Drawer,
  ConfigProvider,
  Badge,
  List,
  message,
  Card,
} from "antd";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  User,
  Users,
  Plus,
  ChevronDown,
  Briefcase,
  Menu as MenuIcon,
  LogOut,
  Check,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { Role } from "@/lib/constants";
import logo from "../../public/Biometrik_New_Logo.png";

// Notification Dropdown Component
function NotificationDropdown() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (res.ok) {
        setNotifications(json.data);
        setUnreadCount(json.data.filter((n: any) => !n.read).length);
      }
    } catch (err: any) {
      if (err.message !== "Failed to fetch") {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string, projectId?: string, title?: string) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
        if (projectId) {
          const isChat =
            title?.toLowerCase().includes("chat") || title?.toLowerCase().includes("message");
          router.push(`/projects/${projectId}${isChat ? "?tab=chat" : ""}`);
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
        setUnreadCount(0);
        message.success("All notifications marked as read");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const notificationMenu = (
    <Card
      title="Notifications"
      extra={
        <Button type="link" size="small" onClick={handleMarkAllAsRead} disabled={unreadCount === 0}>
          Mark all as read
        </Button>
      }
      variant="borderless"
      styles={{ body: { padding: 0 } }}
      style={{
        width: 350,
        maxHeight: 400,
        overflowY: "auto",
        boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
        borderRadius: 8,
      }}
    >
      <List
        loading={loading}
        dataSource={notifications}
        locale={{ emptyText: "No notifications" }}
        renderItem={(item) => (
          <List.Item
            onClick={() => handleMarkAsRead(item._id, item.projectId, item.title)}
            style={{
              padding: "12px 16px",
              cursor: "pointer",
              backgroundColor: item.read ? "transparent" : "#f0f7ff",
              borderBottom: "1px solid #f0f0f0",
              transition: "background 0.3s",
            }}
            className="hover:bg-gray-50"
          >
            <List.Item.Meta
              title={
                <span style={{ fontWeight: item.read ? 400 : 600, fontSize: 13, color: "#222" }}>
                  {item.title}
                </span>
              }
              description={
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#666" }}>{item.message}</span>
                  <span style={{ fontSize: 10, color: "#aaa" }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );

  return (
    <Dropdown popupRender={() => notificationMenu} trigger={["click"]} placement="bottomRight">
      <Badge count={unreadCount} size="small" offset={[-2, 4]} style={{ cursor: "pointer" }}>
        <Button type="text" shape="circle" icon={<Bell size={18} color="#676879" />} />
      </Badge>
    </Dropdown>
  );
}

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; designation?: string } | null>(
    null
  );
  const pathname = usePathname() || "";
  const router = useRouter();

  useEffect(() => {
    if (pathname === "/projects/new") {
      setCollapsed(true);
    }
  }, [pathname]);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const screens = useBreakpoint();

  // Avoid hydration mismatch by waiting for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user/me", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return data.user;
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
    return null;
  };

  // Cross-tab session sync: reload if a different user logged in on another tab
  useEffect(() => {
    const handleSessionSync = async () => {
      try {
        const response = await fetch("/api/user/me", { cache: "no-store" });
        if (response.ok) {
          const data = await response.json();
          const newUserId = data.user?._id || data.user?.id;
          const currentUserId = (user as any)?._id || (user as any)?.id;
          if (currentUserId && newUserId && String(newUserId) !== String(currentUserId)) {
            window.location.reload();
          }
        }
      } catch (err: any) {
        if (err.message !== "Failed to fetch") {
          console.error("Session sync check error:", err);
        }
      }
    };

    window.addEventListener("focus", handleSessionSync);
    const handleVis = () => {
      if (document.visibilityState === "visible") {
        handleSessionSync();
      }
    };
    document.addEventListener("visibilitychange", handleVis);

    return () => {
      window.removeEventListener("focus", handleSessionSync);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [user]);

  const isMobile = mounted && !screens.md;

  // Branding colors from logo
  const logoTeal = "#00897b";

  // Menu items for the sidebar based on user requirements
  const menuItems = [
    {
      key: "/dashboard",
      icon: <LayoutDashboard size={18} />,
      label: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      key: "/projects",
      icon: <Briefcase size={18} />,
      label: <Link href="/projects">Projects</Link>,
    },
    {
      key: "/calendar",
      icon: <Calendar size={18} />,
      label: <Link href="/calendar">Calendar</Link>,
    },
    {
      key: "/profile",
      icon: <User size={18} />,
      label: <Link href="/profile">My Profile</Link>,
    },
    {
      key: "/admin",
      icon: <ShieldCheck size={18} />,
      label: <Link href="/admin">User Management</Link>,
    },
    {
      key: "/users",
      icon: <Users size={18} />,
      label: <Link href="/users">User Management</Link>,
    },
  ].filter((item) => {
    if (item.key === "/admin") {
      return user?.role === Role.SYSTEM_ADMIN;
    }
    if (item.key === "/users") {
      return user?.role === Role.ADMIN;
    }
    return true;
  });

  // Breadcrumb generator mapping URL tokens naturally
  const pathSnippets = pathname.split("/").filter((i) => i);
  const breadcrumbItems = [
    {
      title: <Link href="/dashboard">Home</Link>,
    },
    ...pathSnippets.map((snippet, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join("/")}`;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(snippet);
      const displayLabel = isMongoId
        ? "Workspace"
        : snippet === "admin" || snippet === "users"
          ? "User Management"
          : snippet.replace("-", " ");
      return {
        title: (
          <Link href={url} style={{ textTransform: "capitalize" }}>
            {displayLabel}
          </Link>
        ),
      };
    }),
  ];

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/auth/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const renderSidebarContent = (isDrawer = false) => {
    const isActuallyCollapsed = isDrawer ? false : collapsed;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
          <div
            style={{
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: isActuallyCollapsed ? "0 8px" : "0 24px",
              overflow: "hidden",
              transition: "all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                position: "relative",
              }}
            >
              <Image
                src={logo}
                alt="Logo"
                width={isActuallyCollapsed ? 48 : 180}
                height={40}
                priority
                style={{
                  width: isActuallyCollapsed ? "48px" : "180px",
                  height: "auto",
                  objectFit: "contain",
                  transition: "width 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)",
                }}
              />
            </div>
          </div>

          <Menu
            theme="light"
            mode="inline"
            inlineCollapsed={isActuallyCollapsed}
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={() => {
              if (isDrawer) setDrawerVisible(false);
            }}
            style={{
              background: "transparent",
              borderRight: 0,
              marginTop: 8,
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <Layout style={{ height: "100vh", overflow: "hidden" }}>
      {mounted && !isMobile && (
        <Sider
          theme="light"
          collapsible
          trigger={null}
          collapsed={collapsed}
          collapsedWidth={80}
          width={260}
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            borderRight: "1px solid #f0f0f0",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            transition: "width 0.2s",
          }}
        >
          {renderSidebarContent(false)}
        </Sider>
      )}

      {mounted && isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{ body: { padding: 0 } }}
          size={260}
          closable={false}
        >
          {renderSidebarContent(true)}
        </Drawer>
      )}

      <Layout
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        <Header
          style={{
            padding: "0 16px",
            background: colorBgContainer,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
            position: "sticky",
            top: 0,
            zIndex: 1,
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <Button
              type="text"
              icon={<MenuIcon size={20} />}
              onClick={() => {
                if (isMobile) {
                  setDrawerVisible(true);
                } else {
                  setCollapsed(!collapsed);
                }
              }}
              style={{
                fontSize: "16px",
                width: 40,
                height: 40,
                marginRight: 8,
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginLeft: 16 }}>
            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            <Dropdown
              menu={{
                items: [
                  { key: "1", label: <Link href="/profile">Profile</Link> },
                  { type: "divider" },
                  {
                    key: "2",
                    label: "Logout",
                    icon: <LogOut size={16} />,
                    danger: true,
                    onClick: handleLogout,
                  },
                ],
              }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  transition: "background 0.3s",
                }}
                className="profile-trigger"
              >
                <Avatar
                  style={{
                    backgroundColor: "#00897b",
                    color: "#fff",
                    fontWeight: 600,
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </Avatar>
                {!isMobile && (
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                    <span
                      style={{ fontWeight: 600, color: "rgba(0, 0, 0, 0.85)", fontSize: "14px" }}
                    >
                      {user?.name || "Loading..."}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "rgba(0, 0, 0, 0.45)",
                        textTransform: "capitalize",
                      }}
                    >
                      {user?.role === Role.SYSTEM_ADMIN
                        ? "System Admin"
                        : user?.designation ||
                          user?.role?.toLowerCase().replace("_", " ") ||
                          "Employee"}
                    </span>
                  </div>
                )}
              </div>
            </Dropdown>
            <style jsx>{`
              .profile-trigger:hover {
                background: rgba(0, 0, 0, 0.025);
              }
            `}</style>
          </div>
        </Header>

        <Content
          style={{
            margin: mounted && isMobile ? "0 8px 8px 8px" : "0 16px 16px 16px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flex: 1,
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          <Breadcrumb
            items={breadcrumbItems}
            style={{
              margin: mounted && isMobile ? "8px 0" : "12px 0",
              padding: "0 8px",
              flex: "0 0 auto",
            }}
          />
          <div
            style={{
              padding: mounted && isMobile ? 12 : 20,
              flex: 1,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              overflowX: "hidden",
              minHeight: 0,
              minWidth: 0,
              maxWidth: "100%",
            }}
          >
            {children}
          </div>
        </Content>
        <Layout.Footer
          style={{
            textAlign: "center",
            padding: "12px 20px",
            background: "#fff",
            borderTop: "1px solid #f0f0f0",
            fontSize: "13px",
            color: "#8c8c8c",
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          © {new Date().getFullYear()}{" "}
          <strong style={{ color: "#00897b" }}>Biometrik® Systems</strong>. All rights reserved.
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
