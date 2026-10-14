import React from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
}

// Atlassian 9-dot App Switcher icon
export const JiraAppSwitcherIcon: React.FC<IconProps> = ({
  size = 20,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="5" cy="5" r="2" fill={color} />
    <circle cx="12" cy="5" r="2" fill={color} />
    <circle cx="19" cy="5" r="2" fill={color} />
    <circle cx="5" cy="12" r="2" fill={color} />
    <circle cx="12" cy="12" r="2" fill={color} />
    <circle cx="19" cy="12" r="2" fill={color} />
    <circle cx="5" cy="19" r="2" fill={color} />
    <circle cx="12" cy="19" r="2" fill={color} />
    <circle cx="19" cy="19" r="2" fill={color} />
  </svg>
);

// Jira Dashboard icon (Atlassian gauge / layout symbol)
export const JiraDashboardIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect
      x="3"
      y="3"
      width="8"
      height="8"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="13"
      y="3"
      width="8"
      height="12"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="3"
      y="13"
      width="8"
      height="8"
      rx="2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect
      x="13"
      y="17"
      width="8"
      height="4"
      rx="1.5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Jira Projects / Kanban Boards icon
export const JiraProjectsIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3 5a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293L12 5H19a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 11h8M8 15h5" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Jira Calendar icon
export const JiraCalendarIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="3" y="4" width="18" height="17" rx="2" stroke={color} strokeWidth="2" />
    <path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="8" cy="15" r="1" fill={color} />
    <circle cx="12" cy="15" r="1" fill={color} />
    <circle cx="16" cy="15" r="1" fill={color} />
  </svg>
);

// Jira Issue / Bug icon (Atlassian issue icon)
export const JiraBugIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect x="6" y="8" width="12" height="12" rx="6" stroke={color} strokeWidth="2" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path
      d="M3 11h3M18 11h3M3 17h3M18 17h3M4 6l3 3M20 6l-3 3"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path d="M12 11v6" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

// Atlassian People / Team Admin icon
export const JiraPeopleIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="9"
      cy="7"
      r="4"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Jira Bell / Notifications icon
export const JiraBellIcon: React.FC<IconProps> = ({
  size = 18,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Atlassian small dropdown chevron
export const JiraChevronDownIcon: React.FC<IconProps> = ({
  size = 12,
  color = "currentColor",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="m6 9 6 6 6-6"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
