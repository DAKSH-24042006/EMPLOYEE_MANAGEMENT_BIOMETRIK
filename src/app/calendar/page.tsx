"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Typography, Card, Button, Drawer, Modal, Form,
  Input, DatePicker, Select, message, Tag, Spin, Space, Popconfirm, Row, Col, Grid
} from "antd";
import {
  LeftOutlined, RightOutlined, PlusOutlined,
  EditOutlined, DeleteOutlined, CalendarOutlined
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface CalendarTask {
  _id: string;
  title: string;
  description: string;
  date: string; // ISO string
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Todo" | "In Progress" | "Done" | "Cancelled";
  color: string;
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
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Responsive Hooks
  const screens = Grid.useBreakpoint();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isMobile = mounted && (!screens.md && (screens.xs || screens.sm));

  // Drawer state
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<CalendarTask | null>(null);
  const [form] = Form.useForm();
  // Store pending add-date so afterOpenChange can use it
  const pendingDateRef = React.useRef<Dayjs>(dayjs());

  const fetchTasks = async (date: Dayjs) => {
    setLoading(true);
    try {
      // Fetch -1 month, current month, +1 month
      const start = date.subtract(1, 'month').startOf('month').toISOString();
      const end = date.add(1, 'month').endOf('month').toISOString();

      const res = await fetch(`/api/calendar-tasks?startDate=${start}&endDate=${end}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error(error);
      messageApi.error("Could not load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(currentDate);
  }, [currentDate]);

  const handlePrevMonth = () => setCurrentDate(currentDate.subtract(1, 'month'));
  const handleNextMonth = () => setCurrentDate(currentDate.add(1, 'month'));
  const handleToday = () => setCurrentDate(dayjs());

  const onDateClick = (date: Dayjs) => {
    setSelectedDate(date);
    setDrawerVisible(true);
  };

  // Open modal inside drawer or from anywhere
  const onAddTask = (date?: Dayjs) => {
    setEditingTask(null);
    pendingDateRef.current = date || selectedDate || dayjs();
    setModalVisible(true);
  };

  const onEditTask = (task: CalendarTask) => {
    setEditingTask(task);
    setModalVisible(true);
  };

  // Called by Modal afterOpenChange — form is guaranteed mounted at this point
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
      messageApi.success("Task deleted");
      // Small delay to allow DB/Server to stabilize after delete before re-fetching
      setTimeout(() => {
        fetchTasks(currentDate);
      }, 300);
    } catch (error) {
      messageApi.error("Could not delete task");
    }
  };

  const handleModalSubmit = async (values: any) => {
    try {
      const isEdit = !!editingTask;
      const url = isEdit ? `/api/calendar-tasks/${editingTask._id}` : `/api/calendar-tasks`;
      const method = isEdit ? "PUT" : "POST";

      const priorityObj = PRIORITIES.find(p => p.value === values.priority);

      const payload = {
        ...values,
        date: values.date.toISOString(),
        color: priorityObj?.color || "#6C8EF5"
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save task");

      messageApi.success(isEdit ? "Task updated" : "Task created");
      setModalVisible(false);
      fetchTasks(currentDate);
    } catch (error) {
      messageApi.error("Could not save task");
    }
  };

  // Calendar Grid Logic
  const generateGrid = () => {
    const startOfMonth = currentDate.startOf('month');
    const endOfMonth = currentDate.endOf('month');
    const startDate = startOfMonth.startOf('week');
    const endDate = endOfMonth.endOf('week');

    const grid = [];
    let d = startDate;

    while (d.isBefore(endDate)) {
      grid.push(d);
      d = d.add(1, 'day');
    }

    return grid;
  };

  const gridDays = generateGrid();

  const getTasksForDate = (date: Dayjs) => {
    return tasks.filter(t => dayjs(t.date).isSame(date, 'day'));
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", padding: "0", minWidth: 0, maxWidth: "100%" }}>
      {contextHolder}
      {/* Header */}
      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16, flex: "0 0 auto" }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Calendar</Title>
          <Text type="secondary">Manage your daily tasks and schedule</Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "nowrap", width: "100%", overflowX: "auto", paddingBottom: 4 }} className="hide-scrollbar">

          {/* Left: Today */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-start", paddingRight: isMobile ? 4 : 16 }}>
            <Button onClick={handleToday} size={isMobile ? "small" : "middle"} style={{ width: "100%", maxWidth: 160 }}>Today</Button>
          </div>

          {/* Center: Month Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, flex: "0 0 auto" }}>
            <Button icon={<LeftOutlined />} onClick={handlePrevMonth} size={isMobile ? "small" : "middle"} />
            <Title level={isMobile ? 5 : 4} style={{ margin: "0", minWidth: isMobile ? 90 : 130, textAlign: "center", lineHeight: isMobile ? "24px" : "32px", whiteSpace: "nowrap" }}>
              {currentDate.format(isMobile ? 'MMM YYYY' : 'MMMM YYYY')}
            </Title>
            <Button icon={<RightOutlined />} onClick={handleNextMonth} size={isMobile ? "small" : "middle"} />
          </div>

          {/* Right: Add Task */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", paddingLeft: isMobile ? 4 : 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => onAddTask()} size={isMobile ? "small" : "middle"} style={{ width: "100%", maxWidth: 160, whiteSpace: "nowrap" }}>Add Task</Button>
          </div>

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
            flexDirection: "column"
          }}
          styles={{ body: { padding: 0, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" } }}
        >
          <div style={{ overflow: "hidden", width: "100%", flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Weekday headers */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #f0f0f0", flex: "0 0 auto" }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                  <div key={idx} style={{ padding: isMobile ? "8px 0" : "12px 0", textAlign: "center", fontWeight: 600, color: "#8c8c8c", fontSize: isMobile ? 12 : 14 }}>
                    {isMobile ? day.charAt(0) : day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", flex: 1, overflowY: "auto" }}>
                {gridDays.map((date, idx) => {
                  const isCurrentMonth = date.isSame(currentDate, 'month');
                  const isToday = date.isSame(dayjs(), 'day');
                  const dayTasks = getTasksForDate(date);

                  return (
                    <div
                      key={idx}
                      onClick={() => onDateClick(date)}
                      style={{
                        minHeight: isMobile ? 60 : "calc((100vh - 350px) / 6)", // Dynamically size cells
                        borderRight: (idx + 1) % 7 !== 0 ? "1px solid #f0f0f0" : "none",
                        borderBottom: "1px solid #f0f0f0",
                        padding: isMobile ? 4 : 8,
                        backgroundColor: isCurrentMonth ? "#fff" : "#fafafa",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        opacity: isMobile && !isCurrentMonth ? 0.6 : 1, // Dim inactive months slightly on mobile
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isCurrentMonth ? "#fcfcfc" : "#f5f5f5";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isCurrentMonth ? "#fff" : "#fafafa";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: isMobile ? "center" : "space-between", alignItems: "center", marginBottom: isMobile ? 6 : 8 }}>
                        <div style={{
                          width: isMobile ? 24 : 28,
                          height: isMobile ? 24 : 28,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isToday ? "#1677ff" : "transparent",
                          color: isToday ? "#fff" : (isCurrentMonth ? "#262626" : "#bfbfbf"),
                          fontWeight: isToday ? 600 : 400,
                          fontSize: isMobile ? 12 : 14
                        }}>
                          {date.format('D')}
                        </div>
                      </div>

                      {/* Task Chips */}
                      <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", flexWrap: "wrap", justifyContent: isMobile ? "center" : "flex-start", gap: isMobile ? 3 : 4 }}>
                        {dayTasks.slice(0, isMobile ? 4 : 3).map(task => (
                          isMobile ? (
                            <div
                              key={task._id}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                backgroundColor: task.color,
                              }}
                            />
                          ) : (
                            <div
                              key={task._id}
                              style={{
                                backgroundColor: `${task.color}20`,
                                color: task.color,
                                padding: "2px 6px",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                border: `1px solid ${task.color}40`,
                                zIndex: 2,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditTask(task);
                              }}
                            >
                              {task.title}
                            </div>
                          )
                        ))}
                        {!isMobile && dayTasks.length > 3 && (
                          <Text type="secondary" style={{ fontSize: 12, textAlign: "center", display: "block", marginTop: 2 }}>
                            + {dayTasks.length - 3} more
                          </Text>
                        )}
                        {isMobile && dayTasks.length > 4 && (
                          <div style={{ fontSize: 10, lineHeight: "6px", color: "#8c8c8c", marginLeft: 2 }}>+</div>
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
      <div style={{ display: "flex", gap: 24, marginTop: 12, justifyContent: "center" }}>
        {PRIORITIES.map(p => (
          <div key={p.value} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: p.color }}></div>
            <Text type="secondary" style={{ fontSize: 13 }}>{p.label}</Text>
          </div>
        ))}
      </div>

      {/* Drawer for Specific Date */}
      <Drawer
        title={selectedDate ? selectedDate.format('dddd, MMMM D, YYYY') : "Tasks"}
        placement="right"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        size="large"
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Title level={5} style={{ margin: 0 }}>
            {selectedDate && getTasksForDate(selectedDate).length} Tasks
          </Title>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => onAddTask(selectedDate || dayjs())}>
            Add New
          </Button>
        </div>

        {selectedDate && getTasksForDate(selectedDate).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#bfbfbf" }}>
            <CalendarOutlined style={{ fontSize: 48, marginBottom: 16, display: "block", opacity: 0.5 }} />
            <Text type="secondary">No tasks for this day</Text>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedDate && getTasksForDate(selectedDate).map(task => (
              <Card key={task._id} size="small" styles={{ body: { padding: 12 } }} style={{ borderLeft: `4px solid ${task.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text strong>{task.title}</Text>
                  <Space size="small">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEditTask(task)} />
                    <Popconfirm
                      title="Delete task"
                      description="Are you sure you want to delete this task?"
                      onConfirm={() => onDeleteTask(task._id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
                {task.description && (
                  <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 13 }}>
                    {task.description}
                  </Text>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <Tag color={task.status === "Done" ? "success" : task.status === "In Progress" ? "processing" : "default"}>
                    {task.status}
                  </Tag>
                  <Tag color={task.color}>{task.priority}</Tag>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Drawer>

      {/* Add / Edit Modal */}
      <Modal
        title={editingTask ? "Edit Task" : "Add Task"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnHidden
        afterOpenChange={populateFormAfterOpen}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleModalSubmit}
          style={{ marginTop: 24 }}
        >
          <Form.Item
            name="title"
            label="Task Title"
            rules={[{ required: true, message: "Please enter a title" }]}
          >
            <Input placeholder="e.g. Call client regarding new specs" />
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
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true }]}
              >
                <Select>
                  {PRIORITIES.map(p => (
                    <Option key={p.value} value={p.value}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: p.color }} />
                        {p.label}
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true }]}
          >
            <Select>
              {STATUSES.map(s => <Option key={s} value={s}>{s}</Option>)}
            </Select>
          </Form.Item>

          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <TextArea rows={3} placeholder="Add any extra details here..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: "right", marginTop: 24 }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingTask ? "Update Task" : "Create Task"}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
