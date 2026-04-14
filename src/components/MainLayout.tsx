"use client";

import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, theme, Avatar, Dropdown, Breadcrumb, Space, Grid, Drawer } from "antd";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { Role } from "@/lib/constants";
import logo from '../../public/Biometrik_New_Logo.png'



const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);
  const pathname = usePathname();
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
      const response = await fetch("/api/user/me");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  const isMobile = mounted && (!screens.md && (screens.xs || screens.sm));

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
      key: "/users",
      icon: <Users size={18} />,
      label: <Link href="/users">Users</Link>,
    },
  ].filter(item => {
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
      return {
        title: <Link href={url} style={{ textTransform: "capitalize" }}>{snippet.replace("-", " ")}</Link>,
      };
    })
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
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              position: "relative"
            }}>
              <Image
                src={logo}
                alt="Logo"
                width={isActuallyCollapsed ? 48 : 180}
                height={40}
                priority
                style={{
                  width: isActuallyCollapsed ? 48 : 180,
                  height: "auto",
                  objectFit: "contain",
                  transition: "width 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)"
                }}
              />
            </div>
          </div>

          <div style={{ padding: isActuallyCollapsed ? "8px" : "0 16px 16px 16px" }}>
            <Dropdown
              menu={{
                items: [
                  {
                    key: "1",
                    label: <Link href="/projects/new">New Project</Link>,
                    icon: <Plus size={14} />,
                  },
                ],
              }}
              trigger={["click"]}
            >
              <button
                style={{
                  height: 48,
                  width: "100%",
                  borderRadius: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isActuallyCollapsed ? "center" : "space-between",
                  padding: isActuallyCollapsed ? "0" : "0 16px",
                  background: logoTeal,
                  border: "none",
                  color: "white",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s",
                }}
              >
                {isActuallyCollapsed ? (
                  <Plus size={20} />
                ) : (
                  <>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      Create New
                    </span>
                    <ChevronDown size={16} />
                  </>
                )}
              </button>
            </Dropdown>
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
              marginTop: 8
            }}
          />
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid #f0f0f0" }}>
          <Button
            icon={<LogOut size={18} />}
            block
            size="large"
            onClick={handleLogout}
            style={{
              height: 44,
              borderRadius: 8,
              border: "1.5px solid #d9d9d9",
              display: "flex",
              alignItems: "center",
              justifyContent: isActuallyCollapsed ? "center" : "flex-start",
              padding: isActuallyCollapsed ? "0" : "0 16px",
              fontWeight: 500,
              color: "rgba(0, 0, 0, 0.65)",
              transition: "all 0.3s ease",
            }}
            className="logout-button-hover"
          >
            {!isActuallyCollapsed && <span style={{ marginLeft: 8 }}>Logout</span>}
          </Button>
          <style jsx global>{`
            .logout-button-hover:hover {
              background-color: #fff1f0 !important;
              color: #ff4d4f !important;
              border-color: #ff4d4f !important;
              transform: translateY(-1px);
              box-shadow: 0 2px 8px rgba(255, 77, 79, 0.15);
            }
          `}</style>
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

      <Layout style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
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

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: 16 }}>
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
                    onClick: handleLogout
                  }
                ]
              }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "8px",
                transition: "background 0.3s"
              }} className="profile-trigger">
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
                    fontSize: "16px"
                  }}
                >
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </Avatar>
                {!isMobile && (
                  <div style={{ display: "flex", flexDirection: "column", lineHeight: "1.2" }}>
                    <span style={{ fontWeight: 600, color: "rgba(0, 0, 0, 0.85)", fontSize: "14px" }}>
                      {user?.name || "Loading..."}
                    </span>
                    <span style={{ fontSize: "12px", color: "rgba(0, 0, 0, 0.45)", textTransform: "capitalize" }}>
                      {user?.role === Role.SALES ? "Sales" : (user?.role?.toLowerCase().replace("_", " ") || "User")}
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
          }}
        >
          <Breadcrumb
            items={breadcrumbItems}
            style={{ margin: mounted && isMobile ? '8px 0' : '12px 0', padding: '0 8px', flex: "0 0 auto" }}
          />
          <div style={{
            padding: mounted && isMobile ? 12 : 20,
            flex: 1,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0
          }}>
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
          Made in India with{" "}
          <span className="inline-block animate-pulse">❤️</span> by{" "}
          <strong style={{ color: "#00897b" }}>
            Biometrik® Systems
          </strong>
          . All rights reserved.
        </Layout.Footer>
      </Layout>
    </Layout>
  );
}
