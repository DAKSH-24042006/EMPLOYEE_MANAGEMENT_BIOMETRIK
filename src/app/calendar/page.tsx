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
    return filteredTasks.filter((t) => {
      if (t.itemType === "project" && t.startDate && t.endDate) {
        const d = date.startOf("day").valueOf();
        const start = dayjs(t.startDate).startOf("day").valueOf();
        const end = dayjs(t.endDate).startOf("day").valueOf();
        return d >= start && d <= end;
      }
      return dayjs(t.date).isSame(date, "day");
    });
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: "0",
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
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

      <Spin spinning={loading} classNames={{ root: "flex-1 overflow-hidden" }}>
        <Card
          variant="borderless"
          style={{
            padding: 0,
            borderRadius: 12,
            overflow: "hidden",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            border: "1px solid #e5e7eb",
          }}
          styles={{
            body: {
              padding: 0,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            },
          }}
        >
          <div
            style={{
              overflow: "hidden",
              width: "100%",
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
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
                  flex: 1,
                  overflowY: "auto",
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
                        minHeight: isMobile ? 60 : "calc((100vh - 350px) / 6)",
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

                      {/* Event Chips */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        {dayTasks.slice(0, isMobile ? 2 : 3).map((task) => {
                          const isPersonal = task.itemType === "personal";
                          const isSprint = task.itemType === "sprint";
                          const isProject = task.itemType === "project";
                          const isDone = task.status === "Done";

                          const bg = isProject
                            ? "#f5f3ff"
                            : isPersonal
                              ? "#eef2ff"
                              : isSprint
                                ? "#ecfdf5"
                                : "#f0fdfa";
                          const borderColor = isProject
                            ? "#ddd6fe"
                            : isPersonal
                              ? "#c7d2fe"
                              : isSprint
                                ? "#a7f3d0"
                                : "#99f6e4";
                          const textColor = isProject
                            ? "#6d28d9"
                            : isPersonal
                              ? "#3730a3"
                              : isSprint
                                ? "#065f46"
                                : "#115e59";

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
                                          ? "Project Timeline"
                                          : `Work Item (${task.projectName || "Project"})`}
                                  </div>
                                  <div style={{ fontSize: 11 }}>
                                    Status: {task.status} | Priority: {task.priority}
                                  </div>
                                  {task.assigneeName && (
                                    <div style={{ fontSize: 11 }}>
                                      Assignee: {task.assigneeName}
                                    </div>
                                  )}
                                </div>
                              }
                            >
                              <div
                                style={{
                                  backgroundColor: bg,
                                  borderLeft: `3px solid ${task.color || "#00897b"}`,
                                  borderTop: `1px solid ${borderColor}`,
                                  borderRight: `1px solid ${borderColor}`,
                                  borderBottom: `1px solid ${borderColor}`,
                                  color: textColor,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  fontSize: 11,
                                  fontWeight: 500,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  textDecoration: isDone ? "line-through" : "none",
                                  opacity: isDone ? 0.65 : 1,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPersonal) {
                                    onEditTask(task);
                                  } else {
                                    setSelectedDate(date);
                                    setDrawerVisible(true);
                                  }
                                }}
                              >
                                {task.title}
                              </div>
                            </Tooltip>
                          );
                        })}

                        {dayTasks.length > (isMobile ? 2 : 3) && (
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 10,
                              textAlign: "center",
                              display: "block",
                              marginTop: 1,
                            }}
                          >
                            + {dayTasks.length - (isMobile ? 2 : 3)} more
                          </Text>
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

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginTop: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
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
            Official Holiday (All Sundays, 2nd & 4th Saturdays)
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#00897b",
              display: "inline-block",
            }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Project Work Items (Due Dates)
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#059669",
              display: "inline-block",
            }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Sprint Deadlines
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#6366f1",
              display: "inline-block",
            }}
          />
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
              backgroundColor: "#8b5cf6",
              display: "inline-block",
            }}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Projects
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
                  <Space direction="vertical" style={{ width: "100%" }} size={10}>
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
                  <Space direction="vertical" style={{ width: "100%" }} size={10}>
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
                                router.push(`/projects/${item.projectId}`);
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
                  <Space direction="vertical" style={{ width: "100%" }} size={10}>
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
              const dateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
              const projectItems = dateTasks.filter((t) => t.itemType === "project");
              if (projectItems.length === 0) return null;

              return (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13, color: "#7c3aed" }}>
                      Project Duration ({projectItems.length})
                    </Text>
                  </div>
                  <Space direction="vertical" style={{ width: "100%" }} size={10}>
                    {projectItems.map((pItem) => (
                      <Card
                        key={pItem._id}
                        size="small"
                        styles={{ body: { padding: 12 } }}
                        style={{
                          borderLeft: "4px solid #8b5cf6",
                          borderRadius: 8,
                          backgroundColor: "#f5f3ff",
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
                            <Text strong style={{ fontSize: 14, color: "#4c1d95" }}>
                              {pItem.projectName}
                            </Text>
                            <div style={{ fontSize: 11, color: "#7c3aed", marginTop: 2 }}>
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
                              >
                                View Project
                              </Button>
                              <Popconfirm
                                title="Delete project"
                                description="Are you sure you want to delete this project? This will also remove all associated tasks."
                                onConfirm={() => handleDeleteProject(pItem.projectId)}
                                okText="Yes"
                                cancelText="No"
                              >
                                <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </Space>
                          )}
                        </div>
                      </Card>
                    ))}
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
