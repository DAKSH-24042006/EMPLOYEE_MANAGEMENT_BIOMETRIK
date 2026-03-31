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
  Bell,
  Menu as MenuIcon,
} from "lucide-react";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const pathname = usePathname();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const screens = useBreakpoint();

  // Avoid hydration mismatch by waiting for mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
  ];

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

  const renderSidebarContent = (isDrawer = false) => {
    const isActuallyCollapsed = isDrawer ? false : collapsed;
    return (
      <>
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
              src="/Biometrik_New_Logo.png" 
              alt="Logo" 
              width={isActuallyCollapsed ? 48 : 180} 
              height={40} 
              className="object-contain"
              priority
              style={{
                maxWidth: "100%",
                height: "auto",
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
            <Button
              type="primary"
              size="large"
              block
              style={{
                height: 48,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: isActuallyCollapsed ? "center" : "space-between",
                padding: isActuallyCollapsed ? "0" : "0 16px",
                background: logoTeal,
                border: "none",
                fontWeight: 600,
              }}
              icon={isActuallyCollapsed ? <Plus size={20} /> : null}
            >
              {!isActuallyCollapsed && (
                <Space>
                  <span>Create New</span>
                  <ChevronDown size={16} />
                </Space>
              )}
            </Button>
          </Dropdown>
        </div>

        <Menu
          theme="light"
          mode="inline"
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
      </>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {mounted && !isMobile && (
        <Sider
          collapsible
          collapsedWidth={80}
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          theme="light"
          width={260}
          style={{
            position: "sticky",
            top: 0,
            height: "100vh",
            overflow: "auto",
            borderRight: "1px solid #f0f0f0",
            background: "#ffffff",
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
          width={260}
          closable={false}
        >
          {renderSidebarContent(true)}
        </Drawer>
      )}

      <Layout>
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
            <Button type="text" shape="circle" icon={<Bell size={18} color="#676879" />} />
            <Dropdown 
              menu={{ 
                items: [
                  { key: "1", label: <Link href="/profile">Profile</Link> }, 
                  { type: "divider" },
                  { 
                    key: "2", 
                    label: "Logout",
                    onClick: async () => {
                      await fetch("/api/auth/logout", { method: "POST" });
                      window.location.href = "/auth/login";
                    }
                  }
                ] 
              }} 
              placement="bottomRight"
            >
              <Avatar style={{ backgroundColor: "#ffcd00", color: "#333", cursor: "pointer", fontWeight: 600 }}>SS</Avatar>
            </Dropdown>
          </div>
        </Header>
        
        <Content
          style={{
            margin: mounted && isMobile ? "0 8px 16px 8px" : "0 16px 24px 16px",
          }}
        >
          <Breadcrumb 
            items={breadcrumbItems} 
            style={{ margin: mounted && isMobile ? '8px 0' : '16px 0', padding: '0 8px' }} 
          />
          <div style={{
            padding: mounted && isMobile ? 16 : 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
