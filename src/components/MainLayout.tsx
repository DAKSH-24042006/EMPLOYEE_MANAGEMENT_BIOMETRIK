"use client";

import React, { useState } from "react";
import { Layout, Menu, Button, theme, Avatar, Dropdown, Breadcrumb, Space, ConfigProvider } from "antd";
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
  Search,
  Menu as MenuIcon,
} from "lucide-react";

const { Header, Sider, Content } = Layout;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

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

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: logoTeal,
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
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
          <div
            style={{
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: collapsed ? "0 8px" : "0 24px",
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
                width={collapsed ? 48 : 180} 
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

          <div style={{ padding: collapsed ? "8px" : "0 16px 16px 16px" }}>
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
                  justifyContent: collapsed ? "center" : "space-between",
                  padding: collapsed ? "0" : "0 16px",
                  background: logoTeal,
                  border: "none",
                  fontWeight: 600,
                }}
                icon={collapsed ? <Plus size={20} /> : null}
              >
                {!collapsed && (
                  <>
                    <Space>
                      <span>Create New</span>
                      <ChevronDown size={16} />
                    </Space>
                    
                  </>
                )}
              </Button>
            </Dropdown>
          </div>

          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ 
              background: "transparent",
              borderRight: 0,
              marginTop: 8
            }}
          />
        </Sider>
        
        <Layout>
          <Header
            style={{
              padding: "0 24px",
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
            <div style={{ display: "flex", alignItems: "center" }}>
              <Button
                type="text"
                icon={<MenuIcon size={20} />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: "16px",
                  width: 40,
                  height: 40,
                  marginRight: 16,
                }}
              />
              <div style={{ display: "flex", alignItems: "center", background: "#f5f6f8", padding: "6px 16px", borderRadius: 20 }}>
                <Search size={16} color="#676879" />
                <input 
                  placeholder="Search anything..." 
                  style={{ border: "none", background: "transparent", outline: "none", marginLeft: 8, color: "#323338" }}
                />
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
              margin: "0 16px 24px 16px",
            }}
          >
            <Breadcrumb 
              items={breadcrumbItems} 
              style={{ margin: '16px 0', padding: '0 8px' }} 
            />
            <div style={{
              padding: 24,
              minHeight: 280,
              background: colorBgContainer,
              borderRadius: borderRadiusLG,
            }}>
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}
