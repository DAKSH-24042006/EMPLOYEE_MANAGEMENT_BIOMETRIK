"use client";

import React from "react";
import { ConfigProvider, App } from "antd";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#00897b", // Biometrik Teal (Synchronized with Logo)
          colorBgBase: "#ffffff",
          colorTextBase: "#323338", // Standardised dark gray for clarity
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          borderRadius: 8,
          wireframe: false,
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            headerPadding: "0 24px",
            siderBg: "#ffffff",
            bodyBg: "#f9fafb", // Subtle background for consistency
          },
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "#E0F2F1",
            itemSelectedColor: "#00897b",
            itemColor: "#676879",
            itemHoverBg: "#f1f8f7",
            itemBorderRadius: 6,
          },
          Button: {
            borderRadius: 6,
            controlHeight: 36,
            paddingInline: 16,
            fontWeight: 500,
          },
          Table: {
            headerBg: "#f5f6f8",
            headerColor: "#676879",
            headerBorderRadius: 8,
          },
          Card: {
            borderRadiusLG: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
          }
        },
      }}
    >
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}
