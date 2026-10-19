export enum Role {
  SYSTEM_ADMIN = "SYSTEM_ADMIN",
  EMPLOYEE = "EMPLOYEE",
  ADMIN = "ADMIN",
  SALES = "SALES",
  SALES_TEAM = "SALES_TEAM",
  TECH_TEAM = "TECH_TEAM",
  TECH_MANAGER = "TECH_MANAGER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

export const CANONICAL_PROJECT_LIFECYCLE = [
  "In Progress",
  "On Hold (Backlogged)",
  "In Testing",
  "Live / Deployed",
] as const;

export type ProjectLifecycleStatus = (typeof CANONICAL_PROJECT_LIFECYCLE)[number];

export function normalizeProjectStatus(status?: string): ProjectLifecycleStatus {
  if (!status) return "In Progress";
  switch (status) {
    case "In Progress":
      return "In Progress";
    case "On Hold (Backlogged)":
      return "On Hold (Backlogged)";
    case "In Testing":
      return "In Testing";
    case "Live / Deployed":
      return "Live / Deployed";
    case "Testing/UAT":
    case "Signoff Pending":
      return "In Testing";
    case "Delivered":
    case "Completed":
      return "Live / Deployed";
    case "Clarification Required":
    case "Pending":
    case "Closed":
      return "On Hold (Backlogged)";
    default:
      return "In Progress";
  }
}
