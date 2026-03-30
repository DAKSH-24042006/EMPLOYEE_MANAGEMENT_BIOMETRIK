"use client";

import React from "react";
import { ConfigProvider, App } from "antd";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#008C7E", // Biometrik Teal
          colorBgBase: "#ffffff",
          colorTextBase: "#333333",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          borderRadius: 8,
          wireframe: false,
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            headerPadding: "0 24px",
            siderBg: "#ffffff",
          },
          Menu: {
            itemBg: "transparent",
            itemSelectedBg: "#E0F2F1", // Light teal tint
            itemSelectedColor: "#008C7E",
            itemColor: "#676879",
            itemHoverBg: "#f1f8f7", // Slightly minty hover
            itemBorderRadius: 6,
          },
        },
      }}
    >
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}
