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
  Tooltip,
} from "antd";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Menu as MenuIcon, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
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

// Notification Dropdown Component
function NotificationDropdown({ collapsed }: { collapsed?: boolean }) {
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
        setNotifications(json.data || []);
        setUnreadCount((json.data || []).filter((n: any) => !n.read).length);
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
        boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
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

  if (collapsed) {
    return (
      <Dropdown popupRender={() => notificationMenu} trigger={["click"]} placement="topLeft">
        <Tooltip
          title={
            unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "Notifications"
          }
          placement="right"
        >
          <div
            role="button"
            tabIndex={0}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 38,
              borderRadius: 6,
              cursor: "pointer",
              color: "#44546F",
              transition: "all 0.2s ease",
            }}
            className="sidebar-icon-btn"
          >
            <Badge count={unreadCount} size="small" offset={[2, -2]}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <JiraBellIcon size={19} />
              </div>
            </Badge>
          </div>
        </Tooltip>
      </Dropdown>
    );
  }

  return (
    <Dropdown popupRender={() => notificationMenu} trigger={["click"]} placement="topLeft">
      <div
        role="button"
        tabIndex={0}
        className="sidebar-notif-btn"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderRadius: 6,
          cursor: "pointer",
          color: "#44546F",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge count={unreadCount} size="small" offset={[2, -2]}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <JiraBellIcon size={18} />
            </div>
          </Badge>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#44546F" }}>Notifications</span>
        </div>
        {unreadCount > 0 && (
          <span
            style={{
              backgroundColor: "#E0F2F1",
              color: "#00897b",
              fontSize: 11,
              fontWeight: 600,
              padding: "1px 7px",
              borderRadius: 10,
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>
    </Dropdown>
  );
}

// User Profile Section Component
function UserProfileDropdown({
  user,
  collapsed,
  onLogout,
}: {
  user: { name: string; role: string; designation?: string } | null;
  collapsed?: boolean;
  onLogout: () => void;
}) {
  const profileMenuItems = [
    { key: "1", label: <Link href="/profile">Profile</Link> },
    { type: "divider" as const },
    {
      key: "2",
      label: "Logout",
      icon: <LogOut size={15} />,
      danger: true,
      onClick: onLogout,
    },
  ];

  if (collapsed) {
    return (
      <Dropdown menu={{ items: profileMenuItems }} placement="topLeft" trigger={["click"]}>
        <Tooltip title={user?.name || "Profile"} placement="right">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              cursor: "pointer",
              padding: "2px 0",
            }}
          >
            <Avatar
              style={{
                backgroundColor: "#00897b",
                color: "#ffffff",
                fontWeight: 600,
                width: 36,
                height: 36,
                fontSize: 14,
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              }}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </Avatar>
          </div>
        </Tooltip>
      </Dropdown>
    );
  }

  return (
    <Dropdown menu={{ items: profileMenuItems }} placement="topRight" trigger={["click"]}>
      <div
        className="sidebar-user-pill"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          padding: "7px 10px",
          borderRadius: 8,
          transition: "background 0.2s ease",
          background: "rgba(9, 30, 66, 0.03)",
          border: "1px solid #EBECF0",
        }}
      >
        <Avatar
          style={{
            backgroundColor: "#00897b",
            color: "#ffffff",
            fontWeight: 600,
            width: 32,
            height: 32,
            fontSize: 13,
            flexShrink: 0,
            boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
          }}
        >
          {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
        </Avatar>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            lineHeight: 1.2,
            minWidth: 0,
            flex: 1,
          }}
        >
          <span
            style={{
              fontWeight: 600,
              color: "#172B4D",
              fontSize: 13,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user?.name || "Loading..."}
          </span>
          <span
            style={{
              fontSize: 11,
              color: "#626F86",
              textTransform: "capitalize",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user?.role === Role.SYSTEM_ADMIN
              ? "System Admin"
              : user?.designation || user?.role?.toLowerCase().replace("_", " ") || "Employee"}
          </span>
        </div>
        <JiraChevronDownIcon size={12} color="#626F86" />
      </div>
    </Dropdown>
  );
}

const { Content, Sider, Header } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string; designation?: string } | null>(
    null
  );
  const pathname = usePathname() || "";
  const router = useRouter();
  const screens = useBreakpoint();

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  // Avoid hydration mismatch by waiting for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    fetchUserData();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("biometrik_sidebar_collapsed");
      if (saved === "true") {
        setCollapsed(true);
      }
    }
  }, []);

  const handleToggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("biometrik_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

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
      key: "/dashboard-group",
      icon: <JiraDashboardIcon size={18} />,
      label: "Dashboard",
      children: [
        {
          key: "/dashboard",
          label: <Link href="/dashboard">Overview</Link>,
        },
        {
          key: "/dashboard/personal",
          label: <Link href="/dashboard/personal">Personal Dashboard</Link>,
        },
        {
          key: "/dashboard/personal-projects",
          label: <Link href="/dashboard/personal-projects">Personal Projects</Link>,
        },
      ],
    },
    {
      key: "/projects",
      icon: <JiraProjectsIcon size={18} />,
      label: <Link href="/projects">Projects</Link>,
    },
    {
      key: "/calendar",
      icon: <JiraCalendarIcon size={18} />,
      label: <Link href="/calendar">Calendar</Link>,
    },
    {
      key: "/bug-history",
      icon: <JiraBugIcon size={18} />,
      label: <Link href="/bug-history">Bug History</Link>,
    },
    ...(isSuperAdmin
      ? [
          {
            key: "/admin",
            icon: <JiraPeopleIcon size={18} />,
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
            : snippet === "personal-projects"
              ? "Personal Projects"
              : snippet === "personal"
                ? "Personal Dashboard"
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

  // Determine current active key
  let activeKey = "/dashboard";
  if (pathname.startsWith("/dashboard/personal-projects")) {
    activeKey = "/dashboard/personal-projects";
  } else if (pathname.startsWith("/dashboard/personal")) {
    activeKey = "/dashboard/personal";
  } else if (pathname === "/dashboard") {
    activeKey = "/dashboard";
  } else {
    activeKey =
      navItems.find((item) => pathname.startsWith(item.key) && item.key !== "/")?.key || pathname;
  }

  return (
    <Layout
      style={{
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 100% 0%, rgba(0, 149, 135, 0.08) 0%, rgba(245, 248, 250, 0.5) 35%, #F5F8FA 100%)",
      }}
    >
      {/* Desktop Collapsible Side Bar (Replaces Top Bar) */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(val) => {
            setCollapsed(val);
            if (typeof window !== "undefined") {
              localStorage.setItem("biometrik_sidebar_collapsed", String(val));
            }
          }}
          trigger={null}
          width={240}
          collapsedWidth={72}
          theme="light"
          style={{
            height: "100vh",
            maxHeight: "100vh",
            background: "#ffffff",
            borderRight: "1px solid #DFE1E6",
            boxShadow: "1px 0 4px rgba(9, 30, 66, 0.05)",
            zIndex: 100,
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            {/* Sidebar Top: Logo + Minimize / Maximize Toggle */}
            <div
              style={{
                height: collapsed ? "auto" : 58,
                padding: collapsed ? "10px 0 8px" : "0 14px",
                borderBottom: "1px solid #F0F2F5",
                display: "flex",
                flexDirection: collapsed ? "column" : "row",
                alignItems: "center",
                justifyContent: collapsed ? "center" : "space-between",
                gap: collapsed ? 8 : 10,
                flexShrink: 0,
              }}
            >
              {collapsed ? (
                <>
                  <Link
                    href="/dashboard"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "2px",
                      width: "100%",
                    }}
                  >
                    <Image
                      src={logo}
                      alt="Biometrik"
                      style={{
                        width: "56px",
                        height: "auto",
                        maxWidth: "58px",
                        objectFit: "contain",
                      }}
                      priority
                    />
                  </Link>
                  <Button
                    type="text"
                    size="small"
                    icon={<PanelLeftOpen size={16} color="#44546F" />}
                    onClick={handleToggleCollapse}
                    className="sidebar-icon-btn"
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      overflow: "hidden",
                      flex: 1,
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
                  <Button
                    type="text"
                    size="small"
                    icon={<PanelLeftClose size={17} color="#44546F" />}
                    onClick={handleToggleCollapse}
                    className="sidebar-icon-btn"
                    style={{
                      width: 32,
                      height: 32,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  />
                </>
              )}
            </div>

            {/* Middle: Navigation Menu */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: collapsed ? "10px 4px" : "12px 8px",
              }}
            >
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[activeKey]}
                defaultOpenKeys={["/dashboard-group"]}
                items={navItems}
                onClick={({ key }) => {
                  if (key && !key.endsWith("-group")) router.push(key);
                }}
                style={{
                  borderRight: 0,
                  background: "transparent",
                }}
              />
            </div>

            {/* Bottom: Notifications + User Profile (No bottom toggle) */}
            <div
              style={{
                padding: collapsed ? "12px 8px" : "12px 12px",
                borderTop: "1px solid #F0F2F5",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                background: "#FAFBFC",
                flexShrink: 0,
              }}
            >
              {/* Notifications */}
              <NotificationDropdown collapsed={collapsed} />

              {/* User Profile */}
              <UserProfileDropdown user={user} collapsed={collapsed} onLogout={handleLogout} />
            </div>
          </div>
        </Sider>
      )}

      {/* Main Right Content Layout Canvas */}
      <Layout
        style={{
          height: "100vh",
          maxHeight: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          background: "transparent",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Mobile Header (Only visible on screens < lg) */}
        {isMobile && (
          <Header
            style={{
              height: 52,
              lineHeight: "52px",
              padding: "0 16px",
              background: "#ffffff",
              borderBottom: "1px solid #DFE1E6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "sticky",
              top: 0,
              zIndex: 1000,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Button
                type="text"
                icon={<MenuIcon size={20} color="#44546F" />}
                onClick={() => setDrawerVisible(true)}
                style={{ width: 36, height: 36, padding: 0 }}
              />
              <Link href="/dashboard" style={{ display: "flex", alignItems: "center" }}>
                <Image
                  src={logo}
                  alt="Biometrik"
                  height={28}
                  priority
                  style={{ height: 28, width: "auto", objectFit: "contain" }}
                />
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <NotificationDropdown collapsed={true} />
              <UserProfileDropdown user={user} collapsed={true} onLogout={handleLogout} />
            </div>
          </Header>
        )}

        {/* Mobile Slide-out Drawer */}
        {isMobile && (
          <Drawer
            placement="left"
            onClose={() => setDrawerVisible(false)}
            open={drawerVisible}
            styles={{
              body: { padding: 0, display: "flex", flexDirection: "column", height: "100%" },
            }}
            width={260}
            closable={false}
          >
            <div
              style={{
                padding: "16px",
                borderBottom: "1px solid #f0f0f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Image
                src={logo}
                alt="Biometrik"
                height={30}
                style={{ height: 30, width: "auto", objectFit: "contain" }}
              />
              <Button
                type="text"
                size="small"
                icon={<PanelLeftClose size={18} color="#44546F" />}
                onClick={() => setDrawerVisible(false)}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}>
              <Menu
                theme="light"
                mode="inline"
                selectedKeys={[activeKey]}
                defaultOpenKeys={["/dashboard-group"]}
                items={navItems}
                onClick={({ key }) => {
                  setDrawerVisible(false);
                  if (key && !key.endsWith("-group")) router.push(key);
                }}
                style={{ borderRight: 0 }}
              />
            </div>
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid #f0f0f0",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "#FAFBFC",
              }}
            >
              <NotificationDropdown collapsed={false} />
              <UserProfileDropdown user={user} collapsed={false} onLogout={handleLogout} />
            </div>
          </Drawer>
        )}

        {/* Main Full-Width Content Canvas */}
        <Content
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            width: "100%",
            padding: isMobile ? "10px 12px" : "16px 28px",
            minWidth: 0,
          }}
        >
          <Breadcrumb
            separator=">"
            items={breadcrumbItems}
            style={{
              marginBottom: 12,
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
          &copy; {new Date().getFullYear()}{" "}
          <strong style={{ color: "#00897b" }}>Biometrik&reg; Systems</strong>. All rights reserved.
        </Layout.Footer>
      </Layout>

      {/* Sidebar Styling */}
      <style jsx global>{`
        .sidebar-icon-btn:hover {
          background-color: rgba(9, 30, 66, 0.08) !important;
          color: #172b4d !important;
        }
        .sidebar-notif-btn:hover {
          background-color: rgba(9, 30, 66, 0.08) !important;
        }
        .sidebar-user-pill:hover {
          background-color: rgba(9, 30, 66, 0.08) !important;
        }

        .ant-layout-sider-children {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: hidden !important;
        }

        /* Menu customization for Biometrik brand */
        .ant-layout-sider .ant-menu-inline .ant-menu-item {
          border-radius: 6px !important;
          margin-block: 4px !important;
          margin-inline: 4px !important;
          width: calc(100% - 8px) !important;
          height: 38px !important;
          line-height: 38px !important;
          font-size: 13.5px !important;
          color: #44546f !important;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .ant-layout-sider .ant-menu-inline .ant-menu-item:hover {
          background-color: #f1f8f7 !important;
          color: #00897b !important;
        }
        .ant-layout-sider .ant-menu-inline .ant-menu-item:hover svg {
          stroke: #00897b !important;
          color: #00897b !important;
        }
        .ant-layout-sider .ant-menu-inline .ant-menu-item-selected {
          background-color: #e0f2f1 !important;
          color: #00897b !important;
          font-weight: 600 !important;
        }
        .ant-layout-sider .ant-menu-inline .ant-menu-item-selected a {
          color: #00897b !important;
        }
        .ant-layout-sider .ant-menu-inline .ant-menu-item-selected svg {
          stroke: #00897b !important;
          color: #00897b !important;
          filter: drop-shadow(0 0 4px rgba(0, 149, 135, 0.45));
        }

        /* Collapsed menu styling */
        .ant-layout-sider-collapsed .ant-menu-inline-collapsed .ant-menu-item {
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin-inline: auto !important;
          width: 44px !important;
          height: 44px !important;
        }
        .ant-layout-sider-collapsed .ant-menu-inline-collapsed .ant-menu-item .ant-menu-item-icon {
          line-height: 1 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
      `}</style>
    </Layout>
  );
}
