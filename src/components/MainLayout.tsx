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
  Grid,
  Drawer,
  Badge,
  List,
  message,
  Card,
} from "antd";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu as MenuIcon, LogOut } from "lucide-react";
import {
  JiraAppSwitcherIcon,
  JiraDashboardIcon,
  JiraProjectsIcon,
  JiraCalendarIcon,
  JiraBugIcon,
  JiraPeopleIcon,
  JiraBellIcon,
  JiraChevronDownIcon,
} from "@/components/ui/JiraIcons";
import { Role } from "@/lib/constants";
import logo from "../../public/Biometrik_New_Logo.png";
import { HomeOutlined } from "@ant-design/icons";

// Notification Dropdown Component using Jira Bell Icon
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

  const handleMarkAsRead = async (id: string, projectId?: string) => {
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
            onClick={() => handleMarkAsRead(item._id, item.projectId)}
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
        <div
          role="button"
          tabIndex={0}
          className="jira-icon-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            cursor: "pointer",
            color: "#44546F",
            transition: "all 0.2s ease",
          }}
        >
          <JiraBellIcon size={19} />
        </div>
      </Badge>
    </Dropdown>
  );
}

const { Header, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; designation?: string } | null>(
    null
  );
  const pathname = usePathname() || "";
  const screens = useBreakpoint();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

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

  const isMobile = mounted && !screens.lg;
  const isSuperAdmin = user?.role === "SYSTEM_ADMIN" || user?.role === "ADMIN";

  // Navigation Items using official Jira icons
  const navItems = [
    {
      key: "/dashboard",
      icon: <JiraDashboardIcon size={17} />,
      label: <Link href="/dashboard">Dashboard</Link>,
    },
    {
      key: "/projects",
      icon: <JiraProjectsIcon size={17} />,
      label: (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Link href="/projects">Projects</Link>
          <JiraChevronDownIcon size={11} color="#626F86" />
        </span>
      ),
    },
    {
      key: "/calendar",
      icon: <JiraCalendarIcon size={17} />,
      label: <Link href="/calendar">Calendar</Link>,
    },
    {
      key: "/bug-history",
      icon: <JiraBugIcon size={17} />,
      label: <Link href="/bug-history">Bug History</Link>,
    },
    ...(isSuperAdmin
      ? [
          {
            key: "/admin",
            icon: <JiraPeopleIcon size={17} />,
            label: <Link href="/admin">User Management</Link>,
          },
        ]
      : []),
  ];

  // Breadcrumb generator mapping URL tokens naturally
  const pathSnippets = pathname.split("/").filter((i) => i);
  const breadcrumbItems = [
    {
      title: (
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <HomeOutlined style={{ fontSize: 13 }} />
          <span>Home</span>
        </Link>
      ),
    },
    ...pathSnippets.map((snippet, index) => {
      const url = `/${pathSnippets.slice(0, index + 1).join("/")}`;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(snippet);
      const displayLabel = isMongoId
        ? "Workspace"
        : snippet === "admin" || snippet === "users"
          ? "User Management"
          : snippet === "bug-history"
            ? "Bug History"
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

  // Determine current active key for top nav
  const activeKey =
    navItems.find((item) => pathname.startsWith(item.key) && item.key !== "/")?.key ||
    (pathname === "/" ? "/dashboard" : "");

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 100% 0%, rgba(0, 149, 135, 0.08) 0%, rgba(245, 248, 250, 0.5) 35%, #F5F8FA 100%)",
      }}
    >
      {/* Top Navigation Bar - Jira Style */}
      <Header
        style={{
          height: 56,
          lineHeight: "56px",
          padding: "0 20px",
          background: "#ffffff",
          borderBottom: "1px solid #DFE1E6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          boxShadow: "0 1px 2px rgba(9, 30, 66, 0.08)",
        }}
      >
        {/* Left Section: App Switcher + Logo + Navigation Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, height: "100%", flex: 1 }}>
          {/* Mobile hamburger menu toggle */}
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuIcon size={20} color="#44546F" />}
              onClick={() => setDrawerVisible(true)}
              style={{ width: 36, height: 36, padding: 0 }}
            />
          ) : (
            /* Desktop Jira 9-Dot App Switcher Icon */
            <div
              className="jira-icon-btn"
              title="Atlassian Switcher"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 4,
                cursor: "pointer",
                color: "#44546F",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
            >
              <JiraAppSwitcherIcon size={18} />
            </div>
          )}

          {/* Biometrik Brand Logo */}
          <Link
            href="/dashboard"
            style={{
              display: "flex",
              alignItems: "center",
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <Image
              src={logo}
              alt="Biometrik"
              height={32}
              priority
              style={{ height: 32, width: "auto", objectFit: "contain" }}
            />
          </Link>

          {/* Desktop Top Horizontal Navigation Menu */}
          {!isMobile && (
            <nav style={{ display: "flex", alignItems: "center", height: "100%", gap: 2 }}>
              {navItems.map((item) => {
                const isActive = activeKey === item.key;
                return (
                  <div
                    key={item.key}
                    className={`jira-nav-item ${isActive ? "active" : ""}`}
                    style={{
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 12px",
                      position: "relative",
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      color: "#535353",
                      cursor: "pointer",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      borderBottom: isActive ? "3px solid #009587" : "3px solid transparent",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#535353",
                      }}
                    >
                      <span
                        className={`jira-nav-icon ${isActive ? "active-glow" : ""}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          color: "#535353",
                          transition: "all 0.25s ease",
                          filter: isActive
                            ? "drop-shadow(0 0 6px rgba(0, 149, 135, 0.65))"
                            : "none",
                        }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section: Notifications + User Profile */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          {/* Jira-style Notification Bell Dropdown */}
          <NotificationDropdown />

          {/* User Profile Avatar with dropdown */}
          <Dropdown
            menu={{
              items: [
                { key: "1", label: <Link href="/profile">Profile</Link> },
                { type: "divider" },
                {
                  key: "2",
                  label: "Logout",
                  icon: <LogOut size={15} />,
                  danger: true,
                  onClick: handleLogout,
                },
              ],
            }}
            placement="bottomRight"
            trigger={["click"]}
          >
            <div
              className="jira-profile-pill"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: "pointer",
                padding: "3px 8px 3px 4px",
                borderRadius: 6,
                transition: "background 0.2s ease",
              }}
            >
              <Avatar
                style={{
                  backgroundColor: "#00897b",
                  color: "#ffffff",
                  fontWeight: 600,
                  width: 32,
                  height: 32,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </Avatar>
              {!isMobile && (
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
                  <span style={{ fontWeight: 600, color: "#172B4D", fontSize: 13 }}>
                    {user?.name || "Loading..."}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "#626F86",
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
        </div>
      </Header>

      {/* Mobile Drawer Navigation */}
      {mounted && isMobile && (
        <Drawer
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          styles={{ body: { padding: 0 } }}
          size={260}
          closable={false}
        >
          <div style={{ padding: "20px 16px", borderBottom: "1px solid #f0f0f0" }}>
            <Image
              src={logo}
              alt="Biometrik"
              height={32}
              style={{ height: 32, width: "auto", objectFit: "contain" }}
            />
          </div>
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[activeKey]}
            items={navItems}
            onClick={() => setDrawerVisible(false)}
            style={{ borderRight: 0, marginTop: 8 }}
          />
        </Drawer>
      )}

      {/* Main Full-Width Content Canvas */}
      <Content
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          width: "100%",
          padding: isMobile ? "10px 12px" : "14px 24px",
          minWidth: 0,
        }}
      >
        <Breadcrumb
          separator=">"
          items={breadcrumbItems}
          style={{
            marginBottom: 10,
            fontSize: 12.5,
            color: "#6B7280",
          }}
        />

        <div
          style={{
            flex: 1,
            background: pathname === "/projects" ? "transparent" : colorBgContainer,
            borderRadius: pathname === "/projects" ? 0 : borderRadiusLG,
            padding: pathname === "/projects" ? 0 : isMobile ? 14 : 24,
            boxShadow: pathname === "/projects" ? "none" : "0 1px 3px rgba(9, 30, 66, 0.06)",
            overflowY: "auto",
            minHeight: 0,
          }}
        >
          {children}
        </div>
      </Content>

      {/* Footer */}
      <Layout.Footer
        style={{
          textAlign: "center",
          padding: "12px 20px",
          background: "#ffffff",
          borderTop: "1px solid #DFE1E6",
          fontSize: 12,
          color: "#626F86",
          flexShrink: 0,
        }}
      >
        © {new Date().getFullYear()}{" "}
        <strong style={{ color: "#00897b" }}>Biometrik® Systems</strong>. All rights reserved.
      </Layout.Footer>

      {/* Jira Top Bar Styles */}
      <style jsx global>{`
        .jira-icon-btn:hover {
          background-color: #091e420f;
          color: #262626 !important;
        }
        .jira-nav-item a {
          color: #535353 !important;
        }
        .jira-nav-item:hover {
          background-color: #091e420f;
        }
        .jira-nav-item:hover a,
        .jira-nav-item:hover span {
          color: #262626 !important;
        }
        .jira-nav-item:hover .jira-nav-icon {
          filter: drop-shadow(0 0 4px rgba(0, 149, 135, 0.4)) !important;
        }
        .jira-nav-item:active .jira-nav-icon,
        .jira-nav-icon.active-glow {
          filter: drop-shadow(0 0 8px rgba(0, 149, 135, 0.75)) drop-shadow(0 0 2px #009587) !important;
        }
        .jira-nav-item.active {
          box-shadow: inset 0 -2px 8px -2px rgba(0, 149, 135, 0.35);
        }
        .jira-nav-item.active a {
          color: #535353 !important;
          font-weight: 600;
        }
        .jira-profile-pill:hover {
          background-color: #091e420f;
        }
      `}</style>
    </Layout>
  );
}
