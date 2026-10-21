"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Typography,
  Card,
  Button,
  Drawer,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  message,
  Tag,
  Spin,
  Space,
  Popconfirm,
  Row,
  Col,
  Grid,
  Segmented,
  Tooltip,
  Popover,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import dayjs, { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export interface CalendarEventItem {
  _id: string;
  title: string;
  description: string;
  date: string; // ISO string
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Todo" | "In Progress" | "Done" | "Cancelled";
  rawStatus?: string;
  color: string;
  itemType: "personal" | "work_item" | "sprint" | "project";
  isPersonal: boolean;
  projectName?: string;
  projectId?: string;
  assigneeName?: string;
  progress?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

const PRIORITIES = [
  { label: "Low", value: "Low", color: "#6C8EF5" },
  { label: "Medium", value: "Medium", color: "#F5C542" },
  { label: "High", value: "High", color: "#F58C42" },
  { label: "Urgent", value: "Urgent", color: "#F55C5C" },
];

const STATUSES = ["Todo", "In Progress", "Done", "Cancelled"];

// ─────────────────────────────────────────────────────────────────────────────
// Biometrik Brand-Themed Jira Icons (Scoped to this Calendar Dashboard)
// ─────────────────────────────────────────────────────────────────────────────

const JiraProjectMilestoneIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect width="16" height="16" rx="3.5" fill="#00897b" />
    <path
      d="M3.5 5a1 1 0 0 1 1-1h2.586a1 1 0 0 1 .707.293L8.5 5h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V5Z"
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const JiraSprintIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect width="16" height="16" rx="3.5" fill="#059669" />
    <path d="M9 2.5L5 8.5h4.5l-1.5 5 5-7H8.5l1.5-4z" fill="#ffffff" />
  </svg>
);

const JiraTaskIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect width="16" height="16" rx="3.5" fill="#00897b" />
    <path
      d="M4.5 8.5L7 11L12 5"
      stroke="#ffffff"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const JiraStoryIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect width="16" height="16" rx="3.5" fill="#16a34a" />
    <path d="M5 3.5h6v9l-3-2-3 2v-9z" fill="#ffffff" />
  </svg>
);

const JiraBugIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="8" cy="8" r="7.5" fill="#e11d48" />
    <circle cx="8" cy="8" r="3" fill="#ffffff" />
  </svg>
);

const JiraPersonalIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <rect width="16" height="16" rx="3.5" fill="#6366f1" />
    <circle cx="8" cy="8" r="4" stroke="#ffffff" strokeWidth="1.3" />
    <path
      d="M6.5 8l1 1 2-2"
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function getCalendarEventBadge(task: CalendarEventItem) {
  const isPersonal = task.itemType === "personal";
  const isSprint = task.itemType === "sprint";
  const isProject = task.itemType === "project";
  const titleLower = (task.title || "").toLowerCase();
  const typeLower = (task.type || "").toLowerCase();
  const isBug = typeLower.includes("bug") || titleLower.includes("bug");
  const isStory = typeLower.includes("story") || titleLower.includes("story");

  if (isProject) {
    return {
      icon: <JiraProjectMilestoneIcon size={12} />,
      bg: "#f0fdfa",
      borderColor: "#b2dfdb",
      textColor: "#00796b",
      leftBorder: "#00897b",
    };
  }
  if (isSprint) {
    return {
      icon: <JiraSprintIcon size={12} />,
      bg: "#ecfdf5",
      borderColor: "#a7f3d0",
      textColor: "#065f46",
      leftBorder: "#059669",
    };
  }
  if (isBug) {
    return {
      icon: <JiraBugIcon size={12} />,
      bg: "#fff1f2",
      borderColor: "#fecdd3",
      textColor: "#9f1239",
      leftBorder: "#e11d48",
    };
  }
  if (isStory) {
    return {
      icon: <JiraStoryIcon size={12} />,
      bg: "#f0fdf4",
      borderColor: "#bbf7d0",
      textColor: "#166534",
      leftBorder: "#16a34a",
    };
  }
  if (isPersonal) {
    return {
      icon: <JiraPersonalIcon size={12} />,
      bg: "#f8fafc",
      borderColor: "#e2e8f0",
      textColor: "#334155",
      leftBorder: "#6366f1",
    };
  }
  // Default Work Item / Task
  return {
    icon: <JiraTaskIcon size={12} />,
    bg: "#f0fdfa",
    borderColor: "#ccfbf1",
    textColor: "#0f766e",
    leftBorder: "#00897b",
  };
}

export default function CalendarPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [tasks, setTasks] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Responsive Hooks
  const screens = Grid.useBreakpoint();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isMobile = mounted && !screens.md && (screens.xs || screens.sm);

  // Drawer state
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Modal state for Personal Task
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarEventItem | null>(null);
  const [form] = Form.useForm();
  const pendingDateRef = React.useRef<Dayjs>(dayjs());

  const fetchTasks = async (date: Dayjs) => {
    setLoading(true);
    try {
      // Fetch -1 month, current month, +1 month
      const start = date.subtract(1, "month").startOf("month").toISOString();
      const end = date.add(1, "month").endOf("month").toISOString();

      const res = await fetch(
        `/api/calendar-tasks?startDate=${start}&endDate=${end}&includeAll=true`
      );
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error(error);
      messageApi.error("Could not load calendar events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(currentDate);
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, "month"));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, "month"));
  const handleToday = () => setCurrentDate(dayjs());

  const onDateClick = (date: Dayjs) => {
    setSelectedDate(date);
    setDrawerVisible(true);
  };

  // Open modal to add or edit personal task
  const onAddTask = (date?: Dayjs) => {
    setEditingTask(null);
    pendingDateRef.current = date || selectedDate || dayjs();
    setModalVisible(true);
  };

  const onEditTask = (task: CalendarEventItem) => {
    if (!task.isPersonal) return;
    setEditingTask(task);
    setModalVisible(true);
  };

  const populateFormAfterOpen = (open: boolean) => {
    if (!open) return;
    if (editingTask) {
      form.setFieldsValue({ ...editingTask, date: dayjs(editingTask.date) });
    } else {
      form.resetFields();
      form.setFieldsValue({ date: pendingDateRef.current, priority: "Medium", status: "Todo" });
    }
  };

  const onDeleteTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/calendar-tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete task");
      messageApi.success("Personal task deleted");
      setTimeout(() => {
        fetchTasks(currentDate);
      }, 300);
    } catch (error) {
      messageApi.error("Could not delete task");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete project");
      }
      messageApi.success("Project deleted successfully");
      setDrawerVisible(false);
      fetchTasks(currentDate);
    } catch (error: any) {
      messageApi.error(error.message || "Could not delete project");
    }
  };

  const handleToggleStatus = async (task: CalendarEventItem) => {
    if (!task.isPersonal) return;
    try {
      const newStatus = task.status === "Done" ? "Todo" : "Done";
      const res = await fetch(`/api/calendar-tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      messageApi.success(`Task marked as ${newStatus}`);
      fetchTasks(currentDate);
    } catch (error) {
      messageApi.error("Failed to update status");
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      const isEdit = !!editingTask;
      const url = isEdit ? `/api/calendar-tasks/${editingTask._id}` : `/api/calendar-tasks`;
      const method = isEdit ? "PUT" : "POST";

      const priorityObj = PRIORITIES.find((p) => p.value === values.priority);

      const payload = {
        ...values,
        date: values.date.toISOString(),
        color: priorityObj?.color || "#6C8EF5",
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save task");

      messageApi.success(isEdit ? "Personal task updated" : "Personal task created");
      setModalVisible(false);
      fetchTasks(currentDate);
    } catch (error) {
      messageApi.error("Could not save task");
    }
  };

  // Filtered Events
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (typeFilter !== "all" && t.itemType !== typeFilter) return false;
      if (statusFilter !== "all") {
        if (statusFilter === "done" && t.status !== "Done") return false;
        if (statusFilter === "pending" && t.status === "Done") return false;
      }
      return true;
    });
  }, [tasks, typeFilter, statusFilter]);

  // Calendar Grid Logic
  const generateGrid = () => {
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    const startDate = startOfMonth.startOf("week");
    const endDate = endOfMonth.endOf("week");

    const grid = [];
    let d = startDate;

    while (d.isBefore(endDate)) {
      grid.push(d);
      d = d.add(1, "day");
    }

    return grid;
  };

  const gridDays = generateGrid();

  const getTasksForDate = (date: Dayjs) => {
    return filteredTasks.reduce<CalendarEventItem[]>((acc, t) => {
      if (t.itemType === "project" && t.startDate && t.endDate) {
        const isStart = dayjs(t.startDate).isSame(date, "day");
        const isEnd = dayjs(t.endDate).isSame(date, "day");
        const cleanName = t.projectName || t.title.replace(/^Project:\s*/i, "");
        if (isStart && isEnd) {
          acc.push({
            ...t,
            title: `🎯 Milestone: ${cleanName}`,
          });
        } else if (isStart) {
          acc.push({
            ...t,
            title: `🚀 Start: ${cleanName}`,
          });
        } else if (isEnd) {
          acc.push({
            ...t,
            title: `🏁 Due: ${cleanName}`,
          });
        }
        return acc;
      }
      if (dayjs(t.date).isSame(date, "day")) {
        acc.push(t);
      }
      return acc;
    }, []);
  };

  const renderCalendarChip = (task: CalendarEventItem, date: Dayjs) => {
    const isPersonal = task.itemType === "personal";
    const isDone = task.status === "Done";
    const badge = getCalendarEventBadge(task);

    return (
      <Tooltip
        key={task._id}
        title={
          <div>
            <div style={{ fontWeight: 600 }}>{task.title}</div>
            <div style={{ fontSize: 11 }}>
              Type:{" "}
              {task.itemType === "personal"
                ? "Personal Task"
                : task.itemType === "sprint"
                  ? "Sprint Deadline"
                  : task.itemType === "project"
                    ? "Project Milestone"
                    : `Work Item (${task.projectName || "Project"})`}
            </div>
            <div style={{ fontSize: 11 }}>
              Status: {task.status} | Priority: {task.priority}
            </div>
            {task.assigneeName && <div style={{ fontSize: 11 }}>Assignee: {task.assigneeName}</div>}
          </div>
        }
      >
        <div
          className="calendar-event-chip"
          style={{
            backgroundColor: badge.bg,
            borderLeft: `3px solid ${badge.leftBorder}`,
            borderTop: `1px solid ${badge.borderColor}`,
            borderRight: `1px solid ${badge.borderColor}`,
            borderBottom: `1px solid ${badge.borderColor}`,
            color: badge.textColor,
            padding: "2.5px 6px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textDecoration: isDone ? "line-through" : "none",
            opacity: isDone ? 0.65 : 1,
            display: "flex",
            alignItems: "center",
            gap: 5,
            cursor: "pointer",
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (isPersonal) {
              onEditTask(task);
            } else if (task.projectId) {
              router.push(`/projects/${task.projectId}?tab=work-items`);
            } else {
              setSelectedDate(date);
              setDrawerVisible(true);
            }
          }}
        >
          {badge.icon}
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {task.title}
          </span>
        </div>
      </Tooltip>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        paddingBottom: 32,
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <style>{`
        .calendar-task-list::-webkit-scrollbar {
          width: 3px;
          height: 3px;
        }
        .calendar-task-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .calendar-task-list::-webkit-scrollbar-thumb:hover {
          background: #00897b;
        }
        .calendar-event-chip {
          transition: transform 0.12s ease, box-shadow 0.12s ease;
        }
        .calendar-event-chip:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 5px rgba(0, 137, 123, 0.15);
        }
        .more-tasks-btn:hover {
          background: #00897b !important;
          color: #ffffff !important;
          border-color: #00897b !important;
        }
      `}</style>

      {contextHolder}

      {/* Header */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          marginBottom: 16,
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0, color: "#111827" }}>
              Master Schedule & Calendar
            </Title>
            <Text type="secondary">
              View all project work items, sprint deadlines, team milestones, and official holidays.
            </Text>
          </div>
        </div>

        {/* Filter Bar & Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            backgroundColor: "#fff",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #f0f0f0",
          }}
        >
          {/* Navigation Controls */}
          <Space size={8}>
            <Button onClick={handleToday} size="small">
              Today
            </Button>
            <Button icon={<LeftOutlined />} onClick={handlePrevMonth} size="small" />
            <Text
              strong
              style={{ minWidth: 120, textAlign: "center", display: "inline-block", fontSize: 14 }}
            >
              {currentDate.format("MMMM YYYY")}
            </Text>
            <Button icon={<RightOutlined />} onClick={handleNextMonth} size="small" />
          </Space>

          {/* Type Filter */}
          <Space wrap size={10}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Show:
            </Text>
            <Segmented
              value={typeFilter}
              onChange={(val) => setTypeFilter(val as string)}
              options={[
                { label: "All Items", value: "all" },
                { label: "Projects", value: "project" },
                { label: "Personal Tasks", value: "personal" },
                { label: "Work Items", value: "work_item" },
                { label: "Sprints", value: "sprint" },
              ]}
              size="small"
            />

            <Segmented
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as string)}
              options={[
                { label: "All Statuses", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Done", value: "done" },
              ]}
              size="small"
            />
          </Space>
        </div>
      </div>

      <Spin spinning={loading} style={{ width: "100%" }}>
        <Card
          variant="borderless"
          style={{
            padding: 0,
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            border: "1px solid #e5e7eb",
            marginBottom: 16,
            width: "100%",
          }}
          styles={{
            body: {
              padding: 0,
              display: "flex",
              flexDirection: "column",
            },
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              {/* Weekday headers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  borderBottom: "1px solid #f0f0f0",
                  backgroundColor: "#fafafa",
                  flex: "0 0 auto",
                }}
              >
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => {
                  const isSun = idx === 0;
                  const isSat = idx === 6;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: isMobile ? "8px 0" : "10px 0",
                        textAlign: "center",
                        fontWeight: 600,
                        color: isSun ? "#dc2626" : isSat ? "#ea580c" : "#6b7280",
                        fontSize: isMobile ? 11 : 13,
                        backgroundColor: isSun ? "#fef2f2" : isSat ? "#fffbeb" : "transparent",
                      }}
                    >
                      {isMobile ? day.charAt(0) : day}
                    </div>
                  );
                })}
              </div>

              {/* Calendar Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                }}
              >
                {gridDays.map((date, idx) => {
                  const isCurrentMonth = date.isSame(currentDate, "month");
                  const isToday = date.isSame(dayjs(), "day");
                  const dayTasks = getTasksForDate(date);

                  // Holiday calculation: All Sundays, plus 2nd and 4th Saturdays
                  const dayOfWeek = date.day(); // 0 = Sun, 6 = Sat
                  const isSunday = dayOfWeek === 0;
                  const dayOfMonth = date.date();
                  const weekNum = Math.ceil(dayOfMonth / 7);
                  const is2ndOr4thSat = dayOfWeek === 6 && (weekNum === 2 || weekNum === 4);
                  const isHoliday = isSunday || is2ndOr4thSat;
                  const holidayLabel = isSunday ? "Sunday" : `${weekNum === 2 ? "2nd" : "4th"} Sat`;

                  const cellBg = !isCurrentMonth ? "#fafafa" : isHoliday ? "#fff5f5" : "#fff";

                  return (
                    <div
                      key={idx}
                      onClick={() => onDateClick(date)}
                      style={{
                        minHeight: isMobile ? 65 : 105,
                        borderRight: (idx + 1) % 7 !== 0 ? "1px solid #f0f0f0" : "none",
                        borderBottom: "1px solid #f0f0f0",
                        padding: isMobile ? 4 : 8,
                        backgroundColor: cellBg,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = !isCurrentMonth
                          ? "#f0f0f0"
                          : isHoliday
                            ? "#fee2e2"
                            : "#f4fbf7";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = cellBg;
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            width: isMobile ? 22 : 26,
                            height: isMobile ? 22 : 26,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: isToday ? "#00897b" : "transparent",
                            color: isToday
                              ? "#fff"
                              : isHoliday && isCurrentMonth
                                ? "#dc2626"
                                : isCurrentMonth
                                  ? "#1f2937"
                                  : "#9ca3af",
                            fontWeight: isToday || (isHoliday && isCurrentMonth) ? 700 : 500,
                            fontSize: isMobile ? 11 : 13,
                          }}
                        >
                          {date.format("D")}
                        </div>

                        {/* Holiday Badge (No add task button) */}
                        {isHoliday && isCurrentMonth && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#dc2626",
                              backgroundColor: "#fee2e2",
                              padding: "1px 5px",
                              borderRadius: 4,
                              letterSpacing: 0.2,
                            }}
                          >
                            {isMobile ? "OFF" : holidayLabel}
                          </span>
                        )}
                      </div>

                      {/* Event Chips Container with Micro-Scroll & Floating Popover */}
                      <div
                        className="calendar-task-list"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          maxHeight: isMobile ? 65 : 86,
                          overflowY: "auto",
                          paddingRight: 2,
                        }}
                      >
                        {dayTasks.length <= 3 ? (
                          dayTasks.map((task) => renderCalendarChip(task, date))
                        ) : (
                          <>
                            {dayTasks.slice(0, 2).map((task) => renderCalendarChip(task, date))}
                            <Popover
                              trigger="click"
                              placement="bottom"
                              overlayInnerStyle={{ padding: 12, borderRadius: 8 }}
                              content={
                                <div
                                  style={{
                                    width: 280,
                                    maxHeight: 300,
                                    display: "flex",
                                    flexDirection: "column",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: 8,
                                      paddingBottom: 6,
                                      borderBottom: "1px solid #f0f0f0",
                                    }}
                                  >
                                    <Text strong style={{ fontSize: 13, color: "#1e293b" }}>
                                      {date.format("dddd, D MMMM")}
                                    </Text>
                                    <Tag
                                      color="#00897b"
                                      style={{
                                        margin: 0,
                                        borderRadius: 10,
                                        fontSize: 11,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {dayTasks.length} items
                                    </Tag>
                                  </div>
                                  <div
                                    className="calendar-task-list"
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 5,
                                      overflowY: "auto",
                                      maxHeight: 230,
                                      paddingRight: 4,
                                    }}
                                  >
                                    {dayTasks.map((task) => renderCalendarChip(task, date))}
                                  </div>
                                </div>
                              }
                            >
                              <div
                                className="more-tasks-btn"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  textAlign: "center",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "#e6f7f5",
                                  color: "#00796b",
                                  border: "1px solid #b2dfdb",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                + {dayTasks.length - 2} more (view all)
                              </div>
                            </Popover>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </Spin>

      {/* Legend with Biometrik-themed Jira Icons */}
      <div
        style={{
          display: "flex",
          gap: "10px 18px",
          marginTop: 6,
          marginBottom: 20,
          padding: "12px 18px",
          justifyContent: "center",
          flexWrap: "wrap",
          alignItems: "center",
          backgroundColor: "#ffffff",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <JiraProjectMilestoneIcon size={14} />
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, color: "#00796b" }}>
            Project Milestones (Start / Due)
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <JiraSprintIcon size={14} />
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, color: "#059669" }}>
            Sprint Deadlines
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <JiraTaskIcon size={14} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Work Items & Tasks
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <JiraBugIcon size={14} />
          <Text type="secondary" style={{ fontSize: 12, color: "#e11d48" }}>
            Bugs & Defects
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <JiraPersonalIcon size={14} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Personal Tasks
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#dc2626",
              display: "inline-block",
            }}
          />
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 500, color: "#dc2626" }}>
            Official Holiday (All Sundays, 2nd & 4th Sat)
          </Text>
        </div>
        {PRIORITIES.map((p) => (
          <div key={p.value} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {p.label}
            </Text>
          </div>
        ))}
      </div>

      {/* Drawer for Specific Date */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarOutlined style={{ color: "#00897b" }} />
            <span>{selectedDate ? selectedDate.format("dddd, MMMM D, YYYY") : "Schedule"}</span>
          </div>
        }
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        size="large"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Title level={5} style={{ margin: 0 }}>
            {selectedDate && getTasksForDate(selectedDate).length} Items Scheduled
          </Title>
          {selectedDate &&
            (() => {
              const isSun = selectedDate.day() === 0;
              const weekNum = Math.ceil(selectedDate.date() / 7);
              const is2ndOr4thSat = selectedDate.day() === 6 && (weekNum === 2 || weekNum === 4);
              if (isSun || is2ndOr4thSat) {
                return (
                  <Tag
                    color="error"
                    style={{ fontSize: 12, padding: "2px 8px", borderRadius: 6, margin: 0 }}
                  >
                    {isSun ? "Sunday Holiday" : `${weekNum === 2 ? "2nd" : "4th"} Saturday Holiday`}
                  </Tag>
                );
              }
              return null;
            })()}
        </div>

        {selectedDate && getTasksForDate(selectedDate).length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#bfbfbf" }}>
            <CalendarOutlined
              style={{ fontSize: 44, marginBottom: 16, display: "block", opacity: 0.4 }}
            />
            <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              No events or tasks scheduled for this day
            </Text>
            {(() => {
              const isSun = selectedDate.day() === 0;
              const weekNum = Math.ceil(selectedDate.date() / 7);
              const is2ndOr4thSat = selectedDate.day() === 6 && (weekNum === 2 || weekNum === 4);
              if (isSun || is2ndOr4thSat) {
                return (
                  <Text type="secondary" style={{ color: "#dc2626", fontWeight: 500 }}>
                    Official non-working company holiday.
                  </Text>
                );
              }
              return null;
            })()}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 1. Personal Tasks Section */}
            {(() => {
              const dateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
              const personalItems = dateTasks.filter((t) => t.itemType === "personal");
              if (personalItems.length === 0) return null;

              return (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13, color: "#3730a3" }}>
                      Personal Tasks ({personalItems.length})
                    </Text>
                  </div>
                  <Space orientation="vertical" style={{ width: "100%" }} size={10}>
                    {personalItems.map((task) => (
                      <Card
                        key={task._id}
                        size="small"
                        styles={{ body: { padding: 12 } }}
                        style={{
                          borderLeft: `4px solid ${task.color || "#00897b"}`,
                          borderRadius: 8,
                          backgroundColor: task.status === "Done" ? "#f9fafb" : "#fff",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 6,
                          }}
                        >
                          <Space align="start">
                            <Button
                              type="text"
                              size="small"
                              icon={
                                task.status === "Done" ? (
                                  <CheckCircleOutlined style={{ color: "#52c41a" }} />
                                ) : (
                                  <ClockCircleOutlined style={{ color: "#9ca3af" }} />
                                )
                              }
                              onClick={() => handleToggleStatus(task)}
                              title={task.status === "Done" ? "Mark as Incomplete" : "Mark as Done"}
                            />
                            <div>
                              <Text
                                strong
                                style={{
                                  fontSize: 14,
                                  textDecoration: task.status === "Done" ? "line-through" : "none",
                                  color: task.status === "Done" ? "#9ca3af" : "#111827",
                                }}
                              >
                                {task.title}
                              </Text>
                              <Tag color="purple" style={{ marginLeft: 8, fontSize: 10 }}>
                                Personal
                              </Tag>
                            </div>
                          </Space>
                          <Space size="small">
                            <Button
                              type="text"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => onEditTask(task)}
                            />
                            <Popconfirm
                              title="Delete task"
                              description="Are you sure you want to delete this personal task?"
                              onConfirm={() => onDeleteTask(task._id)}
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </div>
                        {task.description && (
                          <Text
                            type="secondary"
                            style={{
                              display: "block",
                              marginBottom: 8,
                              fontSize: 12,
                              paddingLeft: 28,
                            }}
                          >
                            {task.description}
                          </Text>
                        )}
                        <div style={{ display: "flex", gap: 6, paddingLeft: 28 }}>
                          <Tag
                            color={
                              task.status === "Done"
                                ? "success"
                                : task.status === "In Progress"
                                  ? "processing"
                                  : "default"
                            }
                          >
                            {task.status}
                          </Tag>
                          <Tag color={task.color}>{task.priority}</Tag>
                        </div>
                      </Card>
                    ))}
                  </Space>
                </div>
              );
            })()}

            {/* 2. Project Work Items Section */}
            {(() => {
              const dateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
              const workItems = dateTasks.filter((t) => t.itemType === "work_item");
              if (workItems.length === 0) return null;

              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13, color: "#00897b" }}>
                      Project Work Items ({workItems.length})
                    </Text>
                  </div>
                  <Space orientation="vertical" style={{ width: "100%" }} size={10}>
                    {workItems.map((item) => (
                      <Card
                        key={item._id}
                        size="small"
                        styles={{ body: { padding: 12 } }}
                        style={{ borderLeft: `4px solid ${item.color}`, borderRadius: 8 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 6,
                          }}
                        >
                          <div>
                            <Text strong style={{ fontSize: 14 }}>
                              {item.title}
                            </Text>
                            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                              Project:{" "}
                              <Text strong style={{ color: "#00897b" }}>
                                {item.projectName}
                              </Text>{" "}
                              {item.type ? `| ${item.type}` : ""}
                            </div>
                          </div>
                          {item.projectId && (
                            <Button
                              type="link"
                              size="small"
                              icon={<ArrowRightOutlined />}
                              onClick={() => {
                                setDrawerVisible(false);
                                router.push(`/projects/${item.projectId}?tab=work-items`);
                              }}
                            >
                              Open Project
                            </Button>
                          )}
                        </div>
                        {item.description && (
                          <Text
                            type="secondary"
                            style={{ display: "block", marginBottom: 8, fontSize: 12 }}
                          >
                            {item.description}
                          </Text>
                        )}
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <Tag color={item.status === "Done" ? "success" : "blue"}>
                            {item.status}
                          </Tag>
                          <Tag color={item.color}>{item.priority}</Tag>
                          {item.assigneeName && (
                            <span style={{ fontSize: 11, color: "#6b7280" }}>
                              Assignee: <Text strong>{item.assigneeName}</Text>
                            </span>
                          )}
                        </div>
                      </Card>
                    ))}
                  </Space>
                </div>
              );
            })()}

            {/* 3. Sprints Section */}
            {(() => {
              const dateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
              const sprintItems = dateTasks.filter((t) => t.itemType === "sprint");
              if (sprintItems.length === 0) return null;

              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13, color: "#059669" }}>
                      Sprint Deadlines ({sprintItems.length})
                    </Text>
                  </div>
                  <Space orientation="vertical" style={{ width: "100%" }} size={10}>
                    {sprintItems.map((sprint) => (
                      <Card
                        key={sprint._id}
                        size="small"
                        styles={{ body: { padding: 12 } }}
                        style={{
                          borderLeft: "4px solid #52c41a",
                          borderRadius: 8,
                          backgroundColor: "#f6ffed",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                          <div>
                            <Text strong style={{ fontSize: 14, color: "#135200" }}>
                              {sprint.title}
                            </Text>
                            <div style={{ fontSize: 11, color: "#52c41a", marginTop: 2 }}>
                              Project: {sprint.projectName}
                            </div>
                            {sprint.description && (
                              <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                                Goal: {sprint.description}
                              </div>
                            )}
                          </div>
                          {sprint.projectId && (
                            <Button
                              type="link"
                              size="small"
                              onClick={() => {
                                setDrawerVisible(false);
                                router.push(`/projects/${sprint.projectId}`);
                              }}
                            >
                              View Project
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </Space>
                </div>
              );
            })()}

            {/* 4. Projects Section */}
            {(() => {
              if (!selectedDate) return null;
              const projectItems = filteredTasks.filter((t) => {
                if (t.itemType === "project" && t.startDate && t.endDate) {
                  const d = selectedDate.startOf("day").valueOf();
                  const start = dayjs(t.startDate).startOf("day").valueOf();
                  const end = dayjs(t.endDate).startOf("day").valueOf();
                  return d >= start && d <= end;
                }
                return false;
              });
              if (projectItems.length === 0) return null;

              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <JiraProjectMilestoneIcon size={14} />
                    <Text strong style={{ fontSize: 13, color: "#00897b" }}>
                      Active Projects Timeline ({projectItems.length})
                    </Text>
                  </div>
                  <Space orientation="vertical" style={{ width: "100%" }} size={10}>
                    {projectItems.map((pItem) => {
                      const isStart = dayjs(pItem.startDate).isSame(selectedDate, "day");
                      const isEnd = dayjs(pItem.endDate).isSame(selectedDate, "day");
                      const cleanName =
                        pItem.projectName || pItem.title.replace(/^Project:\s*/i, "");
                      return (
                        <Card
                          key={pItem._id}
                          size="small"
                          styles={{ body: { padding: 12 } }}
                          style={{
                            borderLeft: "4px solid #00897b",
                            borderRadius: 8,
                            backgroundColor: "#f0fdfa",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <Text strong style={{ fontSize: 14, color: "#00796b" }}>
                                  {cleanName}
                                </Text>
                                {isStart && (
                                  <Tag color="#00897b" style={{ fontSize: 10, borderRadius: 4 }}>
                                    🚀 Kickoff
                                  </Tag>
                                )}
                                {isEnd && (
                                  <Tag color="#059669" style={{ fontSize: 10, borderRadius: 4 }}>
                                    🏁 Delivery Deadline
                                  </Tag>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "#00796b", marginTop: 2 }}>
                                Timeline: {dayjs(pItem.startDate).format("MMM D")} -{" "}
                                {dayjs(pItem.endDate).format("MMM D, YYYY")}
                              </div>
                              {pItem.description && (
                                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                                  {pItem.description}
                                </div>
                              )}
                            </div>
                            {pItem.projectId && (
                              <Space>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => {
                                    setDrawerVisible(false);
                                    router.push(`/projects/${pItem.projectId}`);
                                  }}
                                  style={{ color: "#00897b" }}
                                >
                                  View Project
                                </Button>
                                <Popconfirm
                                  title="Delete project"
                                  description="Are you sure you want to delete this project? This will also remove all associated tasks."
                                  onConfirm={() =>
                                    pItem.projectId && handleDeleteProject(pItem.projectId)
                                  }
                                  okText="Yes"
                                  cancelText="No"
                                >
                                  <Button
                                    type="text"
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                  />
                                </Popconfirm>
                              </Space>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </Space>
                </div>
              );
            })()}
          </div>
        )}
      </Drawer>

      {/* Add / Edit Personal Task Modal */}
      <Modal
        title={editingTask ? "Edit Personal Task" : "Add Personal Task"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnHidden
        afterOpenChange={populateFormAfterOpen}
      >
        <Form form={form} layout="vertical" onFinish={handleModalSubmit} style={{ marginTop: 20 }}>
          <Form.Item
            name="title"
            label="Task Title"
            rules={[{ required: true, message: "Please enter a task title" }]}
          >
            <Input placeholder="e.g. Review client proposal, finish documentation..." />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="date"
                label="Date"
                rules={[{ required: true, message: "Please select a date" }]}
              >
                <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select>
                  {PRIORITIES.map((p) => (
                    <Option key={p.value} value={p.value}>
                      <Space>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: p.color,
                            display: "inline-block",
                          }}
                        />
                        {p.label}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              {STATUSES.map((s) => (
                <Option key={s} value={s}>
                  {s}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Notes / Description">
            <TextArea rows={3} placeholder="Add any personal details, links or checklists..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: "#00897b", borderColor: "#00897b" }}
              >
                {editingTask ? "Update Task" : "Add Task"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
