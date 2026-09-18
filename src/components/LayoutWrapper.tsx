"use client";

import React from "react";
import { usePathname } from "next/navigation";
import MainLayout from "./MainLayout";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  // If we are intersecting any auth module paths (like login),
  // strictly reject throwing the MainLayout shell around the screen.
  if (pathname.startsWith("/auth/")) {
    return <>{children}</>;
  }

  // Otherwise, safely implement the main Dashboard shell.
  return <MainLayout>{children}</MainLayout>;
}
