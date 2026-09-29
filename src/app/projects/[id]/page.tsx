"use client";

import React, { use, useEffect, useState, useRef } from "react";
import {
  Typography,
  Card,
  Tabs,
  Tag,
  Button,
  Row,
  Col,
  Space,
  Select,
  Modal,
  Form,
  Input,
  Checkbox,
  DatePicker,
  Table,
  List,
  Avatar,
  Upload,
  Timeline,
  Divider,
  message,
  Popconfirm,
  Badge,
  Skeleton,
  Progress,
  Steps,
  Radio,
  Drawer,
  Switch,
  Result,
  Spin,
  App,
} from "antd";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  MessageSquare,
  AlertTriangle,
  Paperclip,
  History,
  Info,
  CheckCircle,
  Plus,
  Trash2,
  Download,
  AlertOctagon,
  User as UserIcon,
  Filter,
  ListFilter,
  CheckSquare,
  FileText,
  ShieldAlert,
  Users as UsersIcon,
  Folder,
  FolderPlus,
  File,
  Check,
  CheckCheck,
  Clock,
  TrendingUp,
  Send,
  ChevronRight,
  HardDrive,
  ListTodo,
  ArrowUp,
  Crown,
  Edit3,
  Search,
  Building2,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { FilePdfOutlined, EyeOutlined } from "@ant-design/icons";
import { generateProjectPDF } from "@/lib/reportUtils";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ----------------------------------------------------
// Unified Project Stages Single Source of Truth
// ----------------------------------------------------
const PROJECT_STAGES = [
  { key: "Requirement Created", label: "Requirement Created", shortLabel: "Req. Created" },
  {
    key: "Submitted for Tech Review",
    label: "Submitted for Tech Review",
    shortLabel: "Tech Review",
  },
  { key: "Clarification Required", label: "Clarification Required", shortLabel: "Clarification" },
  { key: "Technically Approved", label: "Technically Approved", shortLabel: "Approved" },
  { key: "Planning", label: "Planning", shortLabel: "Planning" },
  { key: "Development", label: "Development", shortLabel: "Dev" },
  { key: "Testing/UAT", label: "Testing/UAT", shortLabel: "UAT" },
  { key: "Signoff Pending", label: "Signoff Pending", shortLabel: "Signoff" },
  { key: "Delivered", label: "Delivered", shortLabel: "Delivered" },
  { key: "Closed", label: "Closed", shortLabel: "Closed" },
];

// ----------------------------------------------------
// Project Details Client Sub-Component
// ----------------------------------------------------
function ProjectDetailsClient({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabQuery = searchParams.get("tab");
  const { message } = App.useApp();
  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  // Modals & Drawers
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<any>(null);

  // New Lifecycle Modals & Drawers
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isWorkItemModalOpen, setIsWorkItemModalOpen] = useState(false);
  const [submittingWorkItem, setSubmittingWorkItem] = useState(false);
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [isRunTestModalOpen, setIsRunTestModalOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<any>(null);
  const [workItemDetailOpen, setWorkItemDetailOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<any>(null);
  const [isEditWorkItemModalOpen, setIsEditWorkItemModalOpen] = useState(false);
  const [editingWorkItem, setEditingWorkItem] = useState<any>(null);
  const [editWorkItemForm] = Form.useForm();
  const [submittingEditWorkItem, setSubmittingEditWorkItem] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [teamForm] = Form.useForm();

  // Complete Sprint & Drag-and-Drop States
  const [isCompleteSprintModalOpen, setIsCompleteSprintModalOpen] = useState(false);
  const [sprintToComplete, setSprintToComplete] = useState<any>(null);
  const [targetSprintForMigration, setTargetSprintForMigration] = useState<string>("backlog");
  const [draggedWorkItemId, setDraggedWorkItemId] = useState<string | null>(null);
  const [dragOverSprintId, setDragOverSprintId] = useState<string | null>(null);

  // Filters & States
  const [workFilterStatus, setWorkFilterStatus] = useState<string>("All");
  const [workFilterAssignee, setWorkFilterAssignee] = useState<string>("All");
  const [workFilterSprint, setWorkFilterSprint] = useState<string>("All");
  const [workFilterPriority, setWorkFilterPriority] = useState<string>("All");
  const [workFilterOverdue, setWorkFilterOverdue] = useState<boolean>(false);
  const [workSearchQuery, setWorkSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(tabQuery || "work-items");
  const [todoStatusFilter, setTodoStatusFilter] = useState<
    "all" | "todo" | "inprogress" | "blocked" | "completed" | "overdue"
  >("all");

  // Project Calendar & Personal Tasks states
  const [projectPersonalTasks, setProjectPersonalTasks] = useState<any[]>([]);
  const [projectCalendarMonth, setProjectCalendarMonth] = useState<any>(dayjs());
  const [isPersonalTaskModalOpen, setIsPersonalTaskModalOpen] = useState(false);
  const [personalTaskForm] = Form.useForm();

  // Tabs data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [blockers, setBlockers] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [versions, setVersions] = useState<any[]>([]);

  // Expanded Lifecycle states
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [sprints, setSprints] = useState<any[]>([]);
  const [workItems, setWorkItems] = useState<any[]>([]);
  const [testCases, setTestCases] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  // PDF report states & handler
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFilename, setPreviewFilename] = useState("");

  // Forms
  const [editForm] = Form.useForm();
  const [taskForm] = Form.useForm();
  const [blockerForm] = Form.useForm();
  const [resolveForm] = Form.useForm();
  const [sprintForm] = Form.useForm();
  const [workItemForm] = Form.useForm();
  const [testCaseForm] = Form.useForm();
  const [runTestForm] = Form.useForm();
  const [workLogForm] = Form.useForm();
  const [commentForm] = Form.useForm();
  const [selfTaskForm] = Form.useForm();
  const [isSelfTaskModalOpen, setIsSelfTaskModalOpen] = useState(false);
  const [submittingSelfTask, setSubmittingSelfTask] = useState(false);

  // Chat message & mentions state
  const [chatInput, setChatInput] = useState("");
  const [chatMentions, setChatMentions] = useState<string[]>([]);
  const [chatUploading, setChatUploading] = useState(false);
  const [chatFile, setChatFile] = useState<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(0);

  // Drive & Folder states
  const [currentFolder, setCurrentFolder] = useState<string>("/");
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderForm] = Form.useForm();
  const [driveUploading, setDriveUploading] = useState(false);

  // Project Manager & Team determination
  const currentUserId = currentUser?._id || currentUser?.id;
  const techOwnerId = project?.techOwner?._id || project?.techOwner;
  const isProjectLead = Boolean(
    currentUser &&
    (currentUser.role === "SYSTEM_ADMIN" ||
      currentUser.role === "ADMIN" ||
      (techOwnerId && String(currentUserId) === String(techOwnerId)))
  );

  // Ensure regular employees default to todo-progress if they cannot view work-items
  useEffect(() => {
    if (currentUser && !isProjectLead && activeTab === "work-items") {
      setActiveTab("todo-progress");
    }
  }, [currentUser, isProjectLead, activeTab]);

  useEffect(() => {
    if (tabQuery) {
      setActiveTab(tabQuery);
    }
  }, [tabQuery]);

  const projectTeamMembers = React.useMemo(() => {
    const list: any[] = [];
    const addedIds = new Set<string>();

    if (project?.techOwner) {
      const ownerObj =
        typeof project.techOwner === "object"
          ? project.techOwner
          : users.find((u: any) => u._id === project.techOwner);
      if (ownerObj) {
        list.push(ownerObj);
        addedIds.add(String(ownerObj._id || ownerObj.id));
      }
    }

    if (Array.isArray(project?.techTeamMembers)) {
      project.techTeamMembers.forEach((m: any) => {
        const memObj =
          typeof m === "object" && m._id ? m : users.find((u: any) => u._id === (m._id || m));
        const mid = memObj ? String(memObj._id || memObj.id) : String(m);
        if (memObj && !addedIds.has(mid)) {
          list.push(memObj);
          addedIds.add(mid);
        }
      });
    }

    return list.length > 0 ? list : users;
  }, [project, users]);

  // Mentions list for Project Chat (restricted to Project Team only)
  const chatMentionOptions = React.useMemo(() => {
    const list: { label: string; value: string }[] = [];
    const addedIds = new Set<string>();

    // 1. Project Team Members & Project Manager
    projectTeamMembers.forEach((u: any) => {
      const uId = String(u._id || u.id);
      if (!addedIds.has(uId)) {
        const isPM = techOwnerId && String(uId) === String(techOwnerId);
        list.push({
          label: `@${u.name}${isPM ? " (Project Manager)" : ""}`,
          value: uId,
        });
        addedIds.add(uId);
      }
    });

    return list;
  }, [projectTeamMembers, techOwnerId]);

  // Initialize
  useEffect(() => {
    refreshData();
  }, [id]);

  // Real-time chat polling (every 3 seconds)
  useEffect(() => {
    if (!id) return;
    const chatPollInterval = setInterval(() => {
      fetchChat();
    }, 3000);
    return () => clearInterval(chatPollInterval);
  }, [id]);

  // Scroll chat container internally without moving window/page
  const scrollToChatBottom = (behavior: "smooth" | "auto" = "smooth") => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  // When switching to the chat tab, scroll chat box to latest messages
  useEffect(() => {
    if (activeTab === "3" || activeTab === "chat") {
      setTimeout(() => {
        scrollToChatBottom("auto");
      }, 100);
    }
  }, [activeTab]);

  // When chat messages update, ONLY scroll container if activeTab is chat AND user is already near bottom
  useEffect(() => {
    if ((activeTab === "3" || activeTab === "chat") && chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 140;
      if (isNearBottom || chatMessages.length > prevMsgCountRef.current) {
        scrollToChatBottom("smooth");
      }
    }
    prevMsgCountRef.current = chatMessages.length;
  }, [chatMessages, activeTab]);

  const fetchPersonalTasks = async () => {
    try {
      const res = await fetch(`/api/calendar-tasks`);
      if (res.ok) {
        const data = await res.json();
        setProjectPersonalTasks(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePersonalTask = async (values: any) => {
    try {
      const priorityColors: Record<string, string> = {
        Low: "#6C8EF5",
        Medium: "#F5C542",
        High: "#F58C42",
        Urgent: "#F55C5C",
      };
      const payload = {
        title: values.title,
        description: values.description || `Task for project: ${project?.title || ""}`,
        date: values.date.toISOString(),
        priority: values.priority || "Medium",
        status: values.status || "Todo",
        color: priorityColors[values.priority] || "#6C8EF5",
      };
      const res = await fetch("/api/calendar-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        message.success("Personal task created!");
        setIsPersonalTaskModalOpen(false);
        personalTaskForm.resetFields();
        fetchPersonalTasks();
      } else {
        message.error("Failed to create personal task");
      }
    } catch (err) {
      message.error("Failed to create personal task");
    }
  };

  const refreshData = () => {
    fetchProject();
    fetchUsers();
    fetchTasks();
    fetchChat();
    fetchBlockers();
    fetchAttachments();
    fetchVersions();
    fetchCurrentUser();
    fetchSprints();
    fetchWorkItems();
    fetchTestCases();
    fetchActivities();
    fetchPersonalTasks();
  };

  // Fetch functions
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/user/me", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setCurrentUser(json.user);
      }
    } catch (err) {
      console.error("Failed to fetch current user", err);
    }
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`, { cache: "no-store" });
      if (res.status === 403) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (res.ok) {
        setProject(json.data);
        editForm.setFieldsValue({
          title: json.data.title,
          description: json.data.description || "",
          priority: json.data.priority,
          status: json.data.status,
          techOwner: json.data.techOwner?._id || json.data.techOwner,
          techTeamMembers:
            json.data.techTeamMembers?.map((m: any) => m._id) || json.data.techTeamMembers || [],
          sprintId: json.data.sprintId?._id || json.data.sprintId,
          timeline:
            json.data.timeline?.startDate && json.data.timeline?.endDate
              ? [dayjs(json.data.timeline.startDate), dayjs(json.data.timeline.endDate)]
              : undefined,
        });
      } else {
        message.error("Failed to fetch project");
      }
    } catch (err) {
      message.error("Error loading project");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setTasks(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/chat`, { cache: "no-store" });
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      if (res.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      const json = await res.json();
      if (res.ok) setChatMessages(json.data);
    } catch (err: any) {
      if (err.message !== "Failed to fetch") {
        console.error("Chat fetch error:", err);
      }
    }
  };

  const fetchBlockers = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/blockers`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setBlockers(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttachments = async (targetFolder?: string) => {
    try {
      const f = targetFolder !== undefined ? targetFolder : currentFolder;
      const res = await fetch(`/api/projects/${id}/attachments?folder=${encodeURIComponent(f)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) setAttachments(json.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAttachments(currentFolder);
  }, [currentFolder]);

  useEffect(() => {
    if (activeTab === "drive" || activeTab === "5") {
      fetchAttachments(currentFolder);
    }
  }, [activeTab]);

  // Drive Operations
  const handleCreateFolder = async (values: { folderName: string }) => {
    try {
      const res = await fetch(`/api/projects/${id}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_folder",
          folder: currentFolder,
          folderName: values.folderName,
        }),
      });
      if (res.ok) {
        message.success("Folder created!");
        setIsFolderModalOpen(false);
        folderForm.resetFields();
        fetchAttachments(currentFolder);
      } else {
        const json = await res.json();
        message.error(json.error || "Failed to create folder");
      }
    } catch (err) {
      message.error("Error creating folder");
    }
  };

  const handleDriveFileUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setDriveUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", currentFolder);

      const res = await fetch(`/api/projects/${id}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        message.success(`${file.name} uploaded successfully!`);
        fetchAttachments(currentFolder);
        onSuccess(null, file);
      } else {
        const json = await res.json();
        message.error(json.error || "Upload failed");
        onError(new Error("Upload failed"));
      }
    } catch (err) {
      message.error("Upload error");
      onError(err);
    } finally {
      setDriveUploading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        message.success("Item deleted!");
        fetchAttachments(currentFolder);
      } else {
        const json = await res.json();
        message.error(json.error || "Failed to delete item");
      }
    } catch (err) {
      message.error("Error deleting item");
    }
  };

  const fetchVersions = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/versions`);
      const json = await res.json();
      if (res.ok) setVersions(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSprints = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/sprints`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setSprints(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkItems = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/work-items`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setWorkItems(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTestCases = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/test-cases`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setTestCases(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    if (!isProjectLead) return;
    try {
      const res = await fetch(`/api/projects/${id}/activities`, { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setActivities(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  // PDF generation
  const handleGeneratePDF = async () => {
    if (!project) return;
    setGeneratingPDF(true);
    try {
      const { doc, filename } = await generateProjectPDF(project);
      const blob = doc.output("blob");
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewFilename(filename);
      setPreviewOpen(true);
    } catch (err) {
      console.error(err);
      message.error("Failed to generate PDF report.");
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Operations
  const handleUpdateProject = async (values: any) => {
    try {
      const payload: any = {
        title: values.title,
        description: values.description,
        priority: values.priority,
        status: values.status,
        techOwner: values.techOwner,
        techTeamMembers: values.techTeamMembers,
        sprintId: values.sprintId,
        timeline: values.timeline
          ? [values.timeline[0].toISOString(), values.timeline[1].toISOString()]
          : undefined,
        changeReason: values.changeReason || "Update specifications",
      };

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("Project updated successfully!");
        setIsEditModalOpen(false);
        refreshData();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update project");
      }
    } catch (err) {
      message.error("Failed to update project");
    }
  };

  const handleUpdateProjectField = async (payload: any) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("Project updated successfully!");
        refreshData();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update project");
      }
    } catch (err) {
      message.error("Failed to update project");
    }
  };

  const openTeamModal = () => {
    teamForm.setFieldsValue({
      techOwner: project?.techOwner?._id,
      techTeamMembers: project?.techTeamMembers?.map((m: any) => m._id) || [],
    });
    setIsTeamModalOpen(true);
  };

  const handleSaveTeam = async (values: any) => {
    await handleUpdateProjectField({
      techOwner: values.techOwner || null,
      techTeamMembers: values.techTeamMembers || [],
    });
    setIsTeamModalOpen(false);
  };

  const handleCreateTask = async (values: any) => {
    if (!isProjectLead) {
      message.error("Only the Project Manager or System Admin can create and assign tasks.");
      return;
    }
    try {
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          dueDate: values.dueDate.toISOString(),
          assignedTo: values.assignedTo,
        }),
      });

      if (res.ok) {
        message.success("Task created and synced!");
        setIsTaskModalOpen(false);
        taskForm.resetFields();
        fetchTasks();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to create task");
      }
    } catch (err) {
      message.error("Failed to create task");
    }
  };

  const handleCreateBlocker = async (values: any) => {
    try {
      const res = await fetch(`/api/projects/${id}/blockers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (res.ok) {
        message.success("Blocker raised!");
        setIsBlockerModalOpen(false);
        blockerForm.resetFields();
        fetchBlockers();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to raise blocker");
      }
    } catch (err) {
      message.error("Failed to raise blocker");
    }
  };

  const handleResolveBlocker = async (values: any) => {
    if (!selectedBlocker) return;
    try {
      const res = await fetch(`/api/projects/${id}/blockers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockerId: selectedBlocker._id,
          resolutionNote: values.resolutionNote,
        }),
      });

      if (res.ok) {
        message.success("Blocker resolved!");
        setIsResolveModalOpen(false);
        resolveForm.resetFields();
        setSelectedBlocker(null);
        fetchBlockers();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to resolve blocker");
      }
    } catch (err) {
      message.error("Failed to resolve blocker");
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });

      if (res.ok) {
        message.success("Specifications restored to version snapshot.");
        refreshData();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to restore version");
      }
    } catch (err) {
      message.error("Failed to restore version");
    }
  };

  // Chat actions
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !chatFile) return;

    try {
      const payload: any = {
        message: chatInput.trim() || (chatFile ? `Sent a file: ${chatFile.name}` : ""),
        mentions: chatMentions,
      };

      if (chatFile) {
        payload.attachments = [chatFile];
        payload.attachment = { name: chatFile.name, url: chatFile.path };
      }

      const res = await fetch(`/api/projects/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 403) {
        setAccessDenied(true);
        message.error("Access restricted: You are not an assigned member of this project.");
        return;
      }
      if (res.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (res.ok) {
        setChatInput("");
        setChatMentions([]);
        setChatFile(null);
        fetchChat();
        setTimeout(() => scrollToChatBottom("smooth"), 150);
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to send message");
      }
    } catch (err) {
      message.error("Error sending message");
    }
  };

  const handleChatFileUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    setChatUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "/Chat Files");

      const res = await fetch(`/api/projects/${id}/attachments`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        const uploadedAtt = json.data;
        setChatFile({
          name: uploadedAtt.originalName || file.name,
          path: `/api/projects/${id}/attachments/${uploadedAtt._id}`,
          mimeType: uploadedAtt.mimeType || file.type,
          size: uploadedAtt.size || file.size,
        });
        message.success(`${file.name} ready to send!`);
        onSuccess(null, file);
      } else {
        const json = await res.json();
        message.error(json.error || "Upload failed.");
        onError(new Error("Upload failed"));
      }
    } catch (err) {
      message.error("Upload failed.");
      onError(err);
    } finally {
      setChatUploading(false);
    }
  };

  // --- Agile Sprint & Drag/Drop Operations ---
  const handleCreateSprint = async (values: any) => {
    try {
      const res = await fetch(`/api/projects/${id}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("Sprint created!");
        setIsSprintModalOpen(false);
        sprintForm.resetFields();
        fetchSprints();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to create sprint");
      }
    } catch (err) {
      message.error("Failed to create sprint");
    }
  };

  const handleUpdateSprintStatus = async (sprintId: string, status: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/sprints/${sprintId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        message.success(`Sprint status updated to ${status}!`);
        fetchSprints();
        fetchActivities();
        fetchProject();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update sprint");
      }
    } catch (err) {
      message.error("Failed to update sprint");
    }
  };

  const handleDropWorkItemToSprint = async (
    itemId: string | null,
    targetSprintId: string | null
  ) => {
    if (!itemId) return;
    try {
      const res = await fetch(`/api/projects/${id}/work-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sprint: targetSprintId || "" }),
      });
      if (res.ok) {
        const destName = targetSprintId
          ? sprints.find((s) => s._id === targetSprintId)?.name || "sprint"
          : "Backlog";
        message.success(`Work item moved to ${destName}!`);
        fetchWorkItems();
        fetchSprints();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to reassign work item");
      }
    } catch (err) {
      message.error("Failed to reassign work item");
    } finally {
      setDraggedWorkItemId(null);
      setDragOverSprintId(null);
    }
  };

  const handleOpenCompleteSprintModal = (sprint: any) => {
    setSprintToComplete(sprint);
    const planned = sprints.filter((s) => s.status === "Planned" && s._id !== sprint._id);
    if (planned.length > 0) {
      setTargetSprintForMigration(planned[0]._id);
    } else {
      setTargetSprintForMigration("backlog");
    }
    setIsCompleteSprintModalOpen(true);
  };

  const handleConfirmCompleteSprint = async () => {
    if (!sprintToComplete) return;
    try {
      const res = await fetch(`/api/projects/${id}/sprints/${sprintToComplete._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Completed",
          moveIncompleteTasks: true,
          targetSprintId: targetSprintForMigration === "backlog" ? null : targetSprintForMigration,
        }),
      });
      if (res.ok) {
        message.success(
          `Sprint "${sprintToComplete.name}" completed successfully! Incomplete tasks transferred.`
        );
        setIsCompleteSprintModalOpen(false);
        setSprintToComplete(null);
        fetchSprints();
        fetchWorkItems();
        fetchActivities();
        fetchProject();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to complete sprint");
      }
    } catch (err) {
      message.error("Failed to complete sprint");
    }
  };

  // --- Work Items Operations ---
  const handleCreateWorkItem = async (values: any) => {
    if (!isProjectLead) {
      message.error("Only the Project Manager or System Admin can create and assign work items.");
      return;
    }
    setSubmittingWorkItem(true);
    try {
      const res = await fetch(`/api/projects/${id}/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("Work item created successfully!");
        setIsWorkItemModalOpen(false);
        workItemForm.resetFields();
        fetchWorkItems();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to create work item");
      }
    } catch (err) {
      message.error("Failed to create work item");
    } finally {
      setSubmittingWorkItem(false);
    }
  };

  const handleCreateSelfTask = async (values: any) => {
    try {
      setSubmittingSelfTask(true);
      const payload: any = {
        title: values.title.trim(),
        description: values.description || "",
        priority: values.priority || "Medium",
        status: values.status || "To Do",
        type: values.type || "Task",
        dueDate: undefined,
        assignee: currentUserId,
      };

      const res = await fetch(`/api/projects/${id}/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create task");

      message.success("Task created for yourself and added to project work items!");
      setIsSelfTaskModalOpen(false);
      selfTaskForm.resetFields();
      fetchWorkItems();
      fetchActivities();
    } catch (err: any) {
      message.error(err.message || "Failed to create task");
    } finally {
      setSubmittingSelfTask(false);
    }
  };

  const handleUpdateWorkItem = async (itemId: string, updates: any) => {
    try {
      const res = await fetch(`/api/projects/${id}/work-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        message.success("Work item updated!");
        fetchWorkItems();
        fetchActivities();
        const json = await res.json();
        setSelectedWorkItem(json.data);
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update work item");
      }
    } catch (err) {
      message.error("Failed to update work item");
    }
  };

  const openEditWorkItem = (item: any) => {
    if (!item) return;
    setEditingWorkItem(item);
    editWorkItemForm.resetFields();
    editWorkItemForm.setFieldsValue({
      title: item.title,
      description: item.description || "",
      type: item.type || "Task",
      priority: item.priority || "Medium",
      status: item.status || "To Do",
      assignee: item.assignee?._id || item.assignee || undefined,
      sprint: item.sprint?._id || item.sprint || undefined,
      dueDate: item.dueDate ? dayjs(item.dueDate) : undefined,
      estimatedHours: item.estimatedHours !== undefined ? item.estimatedHours : undefined,
      progress: item.progress !== undefined ? item.progress : 0,
    });
    setIsEditWorkItemModalOpen(true);
  };

  const handleSaveEditWorkItem = async (values: any) => {
    if (!editingWorkItem) return;
    setSubmittingEditWorkItem(true);
    try {
      const payload: any = {
        title: values.title,
        description: values.description,
        type: values.type,
        priority: values.priority,
        status: values.status,
        assignee: values.assignee || null,
        sprint: values.sprint || null,
        dueDate: values.dueDate ? values.dueDate.toISOString() : null,
        estimatedHours:
          values.estimatedHours !== undefined && values.estimatedHours !== ""
            ? Number(values.estimatedHours)
            : 0,
        progress:
          values.progress !== undefined && values.progress !== "" ? Number(values.progress) : 0,
      };

      const res = await fetch(`/api/projects/${id}/work-items/${editingWorkItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        message.success("Task updated successfully!");
        setIsEditWorkItemModalOpen(false);
        setEditingWorkItem(null);
        fetchWorkItems();
        fetchActivities();
        if (selectedWorkItem?._id === editingWorkItem._id) {
          const json = await res.json();
          setSelectedWorkItem(json.data);
        }
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update task");
      }
    } catch (err: any) {
      message.error("Failed to update task");
    } finally {
      setSubmittingEditWorkItem(false);
    }
  };

  const handleDeleteWorkItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/work-items/${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        message.success("Work item deleted successfully!");
        fetchWorkItems();
        fetchActivities();
        if (selectedWorkItem?._id === itemId) {
          setSelectedWorkItem(null);
          setWorkItemDetailOpen(false);
        }
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to delete work item");
      }
    } catch (err) {
      message.error("Failed to delete work item");
    }
  };

  const handleAddWorkLog = async (values: any) => {
    if (!selectedWorkItem) return;
    try {
      const res = await fetch(`/api/projects/${id}/work-items/${selectedWorkItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newWorkLog: {
            date: values.date.toISOString(),
            hoursSpent: values.hoursSpent,
            description: values.description,
          },
        }),
      });
      if (res.ok) {
        message.success("Hours logged successfully!");
        workLogForm.resetFields();
        const json = await res.json();
        setSelectedWorkItem(json.data);
        fetchWorkItems();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to log hours");
      }
    } catch (err) {
      message.error("Failed to log hours");
    }
  };

  const handleAddComment = async (values: any) => {
    if (!selectedWorkItem) return;
    try {
      const res = await fetch(`/api/projects/${id}/work-items/${selectedWorkItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newComment: { text: values.text },
        }),
      });
      if (res.ok) {
        message.success("Comment added!");
        commentForm.resetFields();
        const json = await res.json();
        setSelectedWorkItem(json.data);
        fetchWorkItems();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to add comment");
      }
    } catch (err) {
      message.error("Failed to add comment");
    }
  };

  const handleWorkItemUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        await handleAddWorkItemAttachment(file.name, json.url);
        onSuccess(null, file);
      } else {
        message.error("Upload failed.");
        onError(new Error("Upload failed"));
      }
    } catch (err) {
      message.error("Upload failed.");
      onError(err);
    }
  };

  const handleAddWorkItemAttachment = async (name: string, url: string) => {
    if (!selectedWorkItem) return;
    try {
      const res = await fetch(`/api/projects/${id}/work-items/${selectedWorkItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newAttachment: { name, url },
        }),
      });
      if (res.ok) {
        message.success("Attachment linked!");
        const json = await res.json();
        setSelectedWorkItem(json.data);
        fetchWorkItems();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to link attachment");
      }
    } catch (err) {
      message.error("Failed to link attachment");
    }
  };

  // --- Testing & UAT Operations ---
  const handleCreateTestCase = async (values: any) => {
    try {
      const res = await fetch(`/api/projects/${id}/test-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("Test case created!");
        setIsTestCaseModalOpen(false);
        testCaseForm.resetFields();
        fetchTestCases();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to create test case");
      }
    } catch (err) {
      message.error("Failed to create test case");
    }
  };

  const handleRunTestCase = async (values: any) => {
    if (!selectedTestCase) return;
    try {
      const res = await fetch(`/api/projects/${id}/test-cases/${selectedTestCase._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: values.status,
          actualResult: values.actualResult,
          newEvidence:
            values.evidenceName && values.evidenceUrl
              ? {
                  name: values.evidenceName,
                  url: values.evidenceUrl,
                }
              : undefined,
        }),
      });
      if (res.ok) {
        message.success("Test case run updated!");
        setIsRunTestModalOpen(false);
        runTestForm.resetFields();
        setSelectedTestCase(null);
        fetchTestCases();
        fetchActivities();
      } else {
        const err = await res.json();
        message.error(err.error || "Failed to update test case");
      }
    } catch (err) {
      message.error("Failed to update test case");
    }
  };

  const handleQuickBugCreation = (testCase: any) => {
    workItemForm.setFieldsValue({
      title: `[BUG] Test Failed: ${testCase.title}`,
      description: `Test Steps:\n${testCase.steps || ""}\n\nExpected Result:\n${testCase.expectedResult || ""}\n\nActual Result:\n${testCase.actualResult || ""}`,
      type: "Bug",
      priority: "High",
    });
    setIsWorkItemModalOpen(true);
  };

  // Helpers
  const getPriorityColor = (p: string) => {
    switch (p) {
      case "Critical":
        return "red";
      case "High":
        return "orange";
      case "Medium":
        return "blue";
      default:
        return "default";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Closed":
        return "default";
      case "Delivered":
        return "success";
      case "Signoff Pending":
        return "magenta";
      case "Testing/UAT":
        return "warning";
      case "Technically Approved":
        return "purple";
      case "Requirement Created":
        return "blue";
      default:
        return "processing";
    }
  };

  // Unified Biometrik Palette Helpers
  const getProjectStatusStyle = (status: string) => {
    switch (status) {
      case "Requirement Created":
      case "Planning":
        return { bg: "#f0fdfa", color: "#0f766e", border: "#b2dfdb", dot: "#00897b" };
      case "Submitted for Tech Review":
      case "Signoff Pending":
        return { bg: "#f4f8f7", color: "#00695c", border: "#80cbc4", dot: "#00897b" };
      case "Development":
      case "Active":
        return { bg: "#e0f2f1", color: "#004d40", border: "#4db6ac", dot: "#00897b" };
      case "Testing/UAT":
        return { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", dot: "#22c55e" };
      case "Delivered":
      case "Completed":
      case "Technically Approved":
        return { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", dot: "#10b981" };
      case "Clarification Required":
      case "Pending":
        return { bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" };
      default:
        return { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb", dot: "#9ca3af" };
    }
  };

  const getProjectPriorityStyle = (priority: string = "Medium") => {
    switch (priority?.toLowerCase()) {
      case "critical":
        return { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
      case "high":
        return { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" };
      case "medium":
        return { bg: "#f0fdfa", color: "#0f766e", border: "#ccfbf1" };
      default:
        return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
    }
  };

  const getWorkItemPriorityStyle = (p: string = "Medium") => {
    switch (p?.toLowerCase()) {
      case "urgent":
      case "critical":
        return { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
      case "high":
        return { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" };
      case "medium":
        return { bg: "#f0fdfa", color: "#0f766e", border: "#ccfbf1" };
      default:
        return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
    }
  };

  const getWorkItemStatusStyle = (s: string = "Backlog") => {
    switch (s?.toLowerCase()) {
      case "done":
      case "completed":
        return { bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", dot: "#10b981" };
      case "in progress":
        return { bg: "#e0f2f1", color: "#004d40", border: "#80cbc4", dot: "#00897b" };
      case "in review":
        return { bg: "#fffbeb", color: "#92400e", border: "#fde68a", dot: "#f59e0b" };
      case "testing":
        return { bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe", dot: "#8b5cf6" };
      case "blocked":
        return { bg: "#fef2f2", color: "#991b1b", border: "#fecaca", dot: "#ef4444" };
      case "to do":
        return { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", dot: "#3b82f6" };
      default:
        return { bg: "#f8fafc", color: "#475569", border: "#e2e8f0", dot: "#94a3b8" };
    }
  };

  const getWorkItemTypeStyle = (t: string = "Task") => {
    switch (t?.toLowerCase()) {
      case "bug":
        return { bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
      case "feature":
        return { bg: "#f0fdfa", color: "#0f766e", border: "#ccfbf1" };
      case "story":
        return { bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff" };
      default:
        return { bg: "#f1f5f9", color: "#334155", border: "#cbd5e1" };
    }
  };

  if (accessDenied) {
    return (
      <div style={{ padding: "60px 20px", display: "flex", justifyContent: "center" }}>
        <Card
          variant="borderless"
          style={{
            maxWidth: 600,
            width: "100%",
            borderRadius: 16,
            textAlign: "center",
            boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          }}
        >
          <Result
            status="403"
            title="Access Restricted"
            subTitle="You do not have permission to view this project. Projects can only be accessed by assigned team members, the Project Manager, or System Administrators."
            extra={
              <Link href="/projects">
                <Button
                  type="primary"
                  icon={<ArrowLeft size={16} />}
                  style={{ background: "#00897b", borderColor: "#00897b" }}
                >
                  Back to Projects
                </Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  if (loading || !project) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Skeleton active />
        <Text type="secondary">Loading project lifecycle details...</Text>
      </div>
    );
  }

  const openBlockersList = blockers.filter(
    (b) => b.status === "Open" || b.status === "In Progress"
  );

  // --- Strict Closure Checklist Verification ---
  const closureVerification = {
    workItemsDone:
      workItems.filter((w) => w.status !== "Done" && w.status !== "Cancelled").length === 0,
    criticalBlockersResolved:
      blockers.filter(
        (b) =>
          (b.status === "Open" || b.status === "In Progress") &&
          (b.priority === "High" || b.priority === "Critical")
      ).length === 0,
    testCasesPassed:
      testCases.length > 0 && testCases.filter((t) => t.status !== "Passed").length === 0,
    uatPassed: project.uatStatus === "Passed" || project.uatStatus === "Client Accepted",
    internalApproved: !!project.internalApproval?.approved,
    salesApproved: !!project.salesApproval?.approved,
    clientSignoff:
      project.clientSignoffStatus === "Approved" || project.clientSignoffStatus === "Waived",
  };

  const isClosureGatePassed = Object.values(closureVerification).every((v) => v === true);

  // Filtered work items
  const filteredWorkItems = workItems.filter((item) => {
    // If not project lead or admin, strictly restrict to user's assigned items
    if (!isProjectLead) {
      const aid = item.assignee?._id || item.assignee;
      if (String(aid) !== String(currentUserId)) return false;
    }
    if (workSearchQuery.trim()) {
      const q = workSearchQuery.toLowerCase().trim();
      const titleMatch = (item.title || "").toLowerCase().includes(q);
      const descMatch = (item.description || "").toLowerCase().includes(q);
      const assigneeName = (item.assignee?.name || "").toLowerCase();
      if (!titleMatch && !descMatch && !assigneeName.includes(q)) return false;
    }
    if (workFilterStatus !== "All" && item.status !== workFilterStatus) return false;
    if (
      workFilterAssignee !== "All" &&
      (item.assignee?._id || item.assignee) !== workFilterAssignee
    )
      return false;
    if (workFilterSprint !== "All" && (item.sprint?._id || item.sprint) !== workFilterSprint)
      return false;
    if (workFilterPriority !== "All" && item.priority !== workFilterPriority) return false;
    if (workFilterOverdue) {
      const now = new Date();
      if (
        !item.dueDate ||
        new Date(item.dueDate) >= now ||
        item.status === "Done" ||
        item.status === "Cancelled"
      )
        return false;
    }
    return true;
  });

  const totalTasksCount = workItems.length;
  const inProgressTasksCount = workItems.filter(
    (w) => w.status === "In Progress" || w.status === "In Review" || w.status === "Testing"
  ).length;
  const doneTasksCount = workItems.filter(
    (w) => w.status === "Done" || w.status === "Completed"
  ).length;
  const overdueTasksCount = workItems.filter(
    (w) =>
      w.dueDate &&
      dayjs(w.dueDate).isBefore(dayjs(), "day") &&
      w.status !== "Done" &&
      w.status !== "Cancelled"
  ).length;

  const projEndDate = dayjs(project.timeline?.endDate);
  const projDiffDays = projEndDate.diff(dayjs(), "day");
  const projIsOverdue = projDiffDays < 0;
  const projTimelineRemaining = projIsOverdue
    ? `${Math.abs(projDiffDays)}d overdue`
    : projDiffDays === 0
      ? "Due today"
      : `${projDiffDays}d remaining`;

  const projectStatusStyle = getProjectStatusStyle(project.status);
  const projectPriorityStyle = getProjectPriorityStyle(project.priority);

  return (
    <div
      style={{ width: "100%", maxWidth: 1300, margin: "0 auto", paddingBottom: 50, minWidth: 0 }}
    >
      {/* Header Bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <Link
            href="/projects"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "#00897b",
              fontSize: 13,
              fontWeight: 600,
              transition: "all 0.2s ease",
            }}
            className="hover:text-teal-800"
          >
            <ArrowLeft size={15} /> Back to Projects
          </Link>
        </div>

        {/* Title and Top Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Title
                level={2}
                style={{
                  margin: 0,
                  fontWeight: 700,
                  color: "#0f172a",
                  fontSize: 24,
                  letterSpacing: "-0.3px",
                }}
              >
                {project.title || project.clientDetails?.companyName || "Unnamed Project"}
              </Title>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: projectStatusStyle.bg,
                  color: projectStatusStyle.color,
                  border: `1px solid ${projectStatusStyle.border}`,
                  borderRadius: 14,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: projectStatusStyle.dot,
                    display: "inline-block",
                  }}
                />
                {project.status || "Active"}
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  background: projectPriorityStyle.bg,
                  color: projectPriorityStyle.color,
                  border: `1px solid ${projectPriorityStyle.border}`,
                  borderRadius: 14,
                  padding: "2px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {project.priority || "Medium"} Priority
              </div>

              {openBlockersList.length > 0 && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#fef2f2",
                    color: "#991b1b",
                    border: "1px solid #fecaca",
                    borderRadius: 14,
                    padding: "2px 9px",
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  <AlertOctagon size={12} /> {openBlockersList.length} Blocked
                </div>
              )}
            </div>
          </div>

          <Space size={10} wrap>
            {(currentUser?.role === "SYSTEM_ADMIN" ||
              currentUser?.role === "ADMIN" ||
              currentUser?.role === "SALES" ||
              currentUser?.role === "SALES_TEAM") && (
              <Button
                type="primary"
                onClick={() => {
                  if (project) {
                    editForm.setFieldsValue({
                      title: project.title,
                      description: project.description || "",
                      priority: project.priority,
                      status: project.status,
                      techOwner: project.techOwner?._id || project.techOwner,
                      timeline:
                        project.timeline?.startDate && project.timeline?.endDate
                          ? [dayjs(project.timeline.startDate), dayjs(project.timeline.endDate)]
                          : undefined,
                    });
                  }
                  setIsEditModalOpen(true);
                }}
                style={{
                  backgroundColor: "#00897b",
                  borderColor: "#00897b",
                  borderRadius: 8,
                  fontWeight: 500,
                  height: 36,
                }}
              >
                Edit Specifications
              </Button>
            )}
          </Space>
        </div>

        {/* 4 Executive Metadata Cards */}
        <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
          {/* Card 1: Project Manager */}
          <Col xs={24} sm={12} lg={8}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                height: "100%",
              }}
            >
              <Avatar
                size={34}
                style={{ backgroundColor: "#00897b", fontSize: 13, fontWeight: 700, flexShrink: 0 }}
              >
                {(project.techOwner?.name || "Daksh Sheregar").charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "#94a3b8",
                    letterSpacing: "0.5px",
                  }}
                >
                  Project Manager
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.techOwner?.name || "Daksh Sheregar"}
                </div>
              </div>
            </div>
          </Col>

          {/* Card 2: Creator / Admin */}
          <Col xs={24} sm={12} lg={8}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                height: "100%",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#475569",
                  flexShrink: 0,
                }}
              >
                <Shield size={16} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "#94a3b8",
                    letterSpacing: "0.5px",
                  }}
                >
                  Created By
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.createdBy?.name || "System Administrator"}
                </div>
              </div>
            </div>
          </Col>

          {/* Card 3: Timeline */}
          <Col xs={24} sm={12} lg={8}>
            <div
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                height: "100%",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: "#f0fdfa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#00897b",
                  flexShrink: 0,
                }}
              >
                <CalendarIcon size={16} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: "#94a3b8",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Timeline
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: projIsOverdue ? "#b91c1c" : "#00796b",
                    }}
                  >
                    {projTimelineRemaining}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {dayjs(project.timeline?.startDate).format("DD MMM")} –{" "}
                  {dayjs(project.timeline?.endDate).format("DD MMM YYYY")}
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Executive Overview Container */}
        {project.description && (
          <div
            style={{
              padding: "12px 16px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderLeft: "3.5px solid #00897b",
              borderRadius: 8,
              marginBottom: 14,
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "#00897b",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
                marginBottom: 3,
              }}
            >
              Project Scope & Overview
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "#334155",
                lineHeight: "20px",
                whiteSpace: "pre-wrap",
              }}
            >
              {project.description}
            </p>
          </div>
        )}

        {/* Quick KPI Strip */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            padding: "8px 12px",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#475569",
            }}
          >
            <span style={{ fontWeight: 600, color: "#0f172a" }}>Total Work Items:</span>
            <Tag
              style={{
                margin: 0,
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              {totalTasksCount}
            </Tag>
          </div>
          <div style={{ width: 1, height: 16, margin: "0 2px", backgroundColor: "#cbd5e1" }} />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#475569",
            }}
          >
            <span style={{ fontWeight: 600, color: "#0284c7" }}>In Progress:</span>
            <Tag
              style={{
                margin: 0,
                background: "#f0f9ff",
                border: "1px solid #bae6fd",
                color: "#0369a1",
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              {inProgressTasksCount}
            </Tag>
          </div>
          <div style={{ width: 1, height: 16, margin: "0 2px", backgroundColor: "#cbd5e1" }} />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#475569",
            }}
          >
            <span style={{ fontWeight: 600, color: "#16a34a" }}>Completed:</span>
            <Tag
              style={{
                margin: 0,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#15803d",
                borderRadius: 10,
                fontWeight: 600,
              }}
            >
              {doneTasksCount}
            </Tag>
          </div>
          {overdueTasksCount > 0 && (
            <>
              <div style={{ width: 1, height: 16, margin: "0 2px", backgroundColor: "#cbd5e1" }} />
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#dc2626",
                }}
              >
                <span style={{ fontWeight: 600 }}>Overdue:</span>
                <Tag color="error" style={{ margin: 0, borderRadius: 10, fontWeight: 600 }}>
                  {overdueTasksCount}
                </Tag>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
          minWidth: 0,
          maxWidth: "100%",
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            ...(isProjectLead
              ? [
                  {
                    key: "work-items",
                    label: (
                      <Space size={6}>
                        <CheckSquare size={14} />
                        <span>Work Items & Tasks</span>
                        <Badge
                          count={workItems.length}
                          size="small"
                          style={{ backgroundColor: "#00897b" }}
                        />
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: "8px 0" }}>
                        {/* Filters & Actions Row */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 12,
                            marginBottom: 16,
                            padding: "10px 14px",
                            background: "#f8fafc",
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                          }}
                        >
                          <Space size={10} wrap style={{ flex: 1, minWidth: 280 }}>
                            <Input
                              placeholder="Search tasks or assignees..."
                              prefix={<Search size={14} color="#94a3b8" />}
                              value={workSearchQuery}
                              onChange={(e) => setWorkSearchQuery(e.target.value)}
                              allowClear
                              style={{ width: 220, borderRadius: 6 }}
                            />
                            <Select
                              value={workFilterStatus}
                              onChange={setWorkFilterStatus}
                              style={{ width: 130 }}
                            >
                              <Select.Option value="All">All Statuses</Select.Option>
                              {[
                                "Backlog",
                                "To Do",
                                "In Progress",
                                "Blocked",
                                "In Review",
                                "Testing",
                                "Done",
                                "Cancelled",
                              ].map((s) => (
                                <Select.Option key={s} value={s}>
                                  {s}
                                </Select.Option>
                              ))}
                            </Select>
                            <Select
                              value={workFilterAssignee}
                              onChange={setWorkFilterAssignee}
                              style={{ width: 150 }}
                              placeholder="Assignee"
                            >
                              <Select.Option value="All">All Assignees</Select.Option>
                              {users.map((u) => (
                                <Select.Option key={u._id} value={u._id}>
                                  {u.name}
                                </Select.Option>
                              ))}
                            </Select>
                            <Select
                              value={workFilterSprint}
                              onChange={setWorkFilterSprint}
                              style={{ width: 130 }}
                              placeholder="Sprint"
                            >
                              <Select.Option value="All">All Sprints</Select.Option>
                              {sprints.map((s) => (
                                <Select.Option key={s._id} value={s._id}>
                                  {s.name}
                                </Select.Option>
                              ))}
                            </Select>
                            <Select
                              value={workFilterPriority}
                              onChange={setWorkFilterPriority}
                              style={{ width: 120 }}
                              placeholder="Priority"
                            >
                              <Select.Option value="All">All Priorities</Select.Option>
                              {["Low", "Medium", "High", "Urgent"].map((p) => (
                                <Select.Option key={p} value={p}>
                                  {p}
                                </Select.Option>
                              ))}
                            </Select>
                            <Checkbox
                              checked={workFilterOverdue}
                              onChange={(e) => setWorkFilterOverdue(e.target.checked)}
                            >
                              <span style={{ fontSize: 13, color: "#475569" }}>Show Overdue</span>
                            </Checkbox>
                            {(workSearchQuery ||
                              workFilterStatus !== "All" ||
                              workFilterAssignee !== "All" ||
                              workFilterSprint !== "All" ||
                              workFilterPriority !== "All" ||
                              workFilterOverdue) && (
                              <Button
                                size="small"
                                type="text"
                                onClick={() => {
                                  setWorkSearchQuery("");
                                  setWorkFilterStatus("All");
                                  setWorkFilterAssignee("All");
                                  setWorkFilterSprint("All");
                                  setWorkFilterPriority("All");
                                  setWorkFilterOverdue(false);
                                }}
                                style={{ color: "#00897b", fontSize: 12 }}
                              >
                                Reset Filters
                              </Button>
                            )}
                          </Space>

                          <Space>
                            <Button
                              type="primary"
                              icon={<Plus size={14} />}
                              onClick={() => setIsWorkItemModalOpen(true)}
                              style={{
                                backgroundColor: "#00897b",
                                borderColor: "#00897b",
                                borderRadius: 6,
                                fontWeight: 500,
                              }}
                            >
                              Create Work Item
                            </Button>
                          </Space>
                        </div>

                        <Table
                          dataSource={filteredWorkItems}
                          rowKey="_id"
                          pagination={{ defaultPageSize: 15, showSizeChanger: true }}
                          columns={[
                            {
                              title: "Title",
                              dataIndex: "title",
                              key: "title",
                              render: (text, record: any) => {
                                const typeStyle = getWorkItemTypeStyle(record.type);
                                const isTaskOverdue =
                                  record.dueDate &&
                                  dayjs(record.dueDate).isBefore(dayjs(), "day") &&
                                  record.status !== "Done" &&
                                  record.status !== "Cancelled";

                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                                    <a
                                      onClick={() => {
                                        setSelectedWorkItem(record);
                                        setWorkItemDetailOpen(true);
                                      }}
                                      style={{
                                        fontWeight: 600,
                                        color: "#0f172a",
                                        fontSize: 13,
                                        transition: "color 0.2s",
                                      }}
                                      className="hover:text-teal-700"
                                    >
                                      {text}
                                    </a>
                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                      <span
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 600,
                                          padding: "1px 6px",
                                          borderRadius: 4,
                                          background: typeStyle.bg,
                                          color: typeStyle.color,
                                          border: `1px solid ${typeStyle.border}`,
                                        }}
                                      >
                                        {record.type}
                                      </span>
                                      {isTaskOverdue && (
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            padding: "1px 6px",
                                            borderRadius: 4,
                                            background: "#fef2f2",
                                            color: "#991b1b",
                                            border: "1px solid #fecaca",
                                          }}
                                        >
                                          Overdue
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              },
                            },
                            {
                              title: "Assignee",
                              dataIndex: ["assignee", "name"],
                              key: "assignee",
                              render: (name) => {
                                if (!name)
                                  return (
                                    <Text
                                      type="secondary"
                                      style={{ fontStyle: "italic", fontSize: 12 }}
                                    >
                                      Unassigned
                                    </Text>
                                  );
                                return (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <Avatar
                                      size={22}
                                      style={{
                                        backgroundColor: "#00897b",
                                        fontSize: 11,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {name.charAt(0).toUpperCase()}
                                    </Avatar>
                                    <span
                                      style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}
                                    >
                                      {name}
                                    </span>
                                  </div>
                                );
                              },
                            },
                            {
                              title: "Sprint",
                              dataIndex: ["sprint", "name"],
                              key: "sprint",
                              render: (name) => {
                                const sprintName = name || "Backlog";
                                const isBacklog = sprintName.toLowerCase() === "backlog";
                                return (
                                  <Tag
                                    style={{
                                      margin: 0,
                                      borderRadius: 12,
                                      fontSize: 11,
                                      fontWeight: 500,
                                      background: isBacklog ? "#f1f5f9" : "#eff6ff",
                                      color: isBacklog ? "#475569" : "#1d4ed8",
                                      border: `1px solid ${isBacklog ? "#cbd5e1" : "#bfdbfe"}`,
                                    }}
                                  >
                                    {sprintName}
                                  </Tag>
                                );
                              },
                            },
                            {
                              title: "Priority",
                              dataIndex: "priority",
                              key: "priority",
                              render: (p: string = "Medium") => {
                                const pStyle = getWorkItemPriorityStyle(p);
                                return (
                                  <span
                                    style={{
                                      display: "inline-block",
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: "2px 8px",
                                      borderRadius: 12,
                                      background: pStyle.bg,
                                      color: pStyle.color,
                                      border: `1px solid ${pStyle.border}`,
                                    }}
                                  >
                                    {p}
                                  </span>
                                );
                              },
                            },
                            {
                              title: "Status",
                              dataIndex: "status",
                              key: "status",
                              render: (s: string = "Backlog") => {
                                const sStyle = getWorkItemStatusStyle(s);
                                return (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 5,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      padding: "2px 8px",
                                      borderRadius: 12,
                                      background: sStyle.bg,
                                      color: sStyle.color,
                                      border: `1px solid ${sStyle.border}`,
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: sStyle.dot,
                                      }}
                                    />
                                    {s}
                                  </span>
                                );
                              },
                            },
                            {
                              title: "Progress",
                              dataIndex: "progress",
                              key: "progress",
                              width: 130,
                              render: (p) => (
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <Progress
                                    percent={p || 0}
                                    showInfo={false}
                                    strokeColor={p === 100 ? "#10b981" : "#00897b"}
                                    size="small"
                                    style={{ flex: 1, margin: 0 }}
                                  />
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: p === 100 ? "#16a34a" : "#00897b",
                                      minWidth: 26,
                                      textAlign: "right",
                                    }}
                                  >
                                    {p || 0}%
                                  </span>
                                </div>
                              ),
                            },
                            {
                              title: "Due Date",
                              dataIndex: "dueDate",
                              key: "dueDate",
                              render: (d, record: any) => {
                                if (!d)
                                  return (
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                      —
                                    </Text>
                                  );
                                const isTaskOverdue =
                                  dayjs(d).isBefore(dayjs(), "day") &&
                                  record.status !== "Done" &&
                                  record.status !== "Cancelled";
                                return (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 5,
                                      fontSize: 12,
                                      color: isTaskOverdue ? "#b91c1c" : "#475569",
                                      fontWeight: isTaskOverdue ? 600 : 400,
                                    }}
                                  >
                                    <CalendarIcon
                                      size={12}
                                      style={{ color: isTaskOverdue ? "#b91c1c" : "#94a3b8" }}
                                    />
                                    <span>{dayjs(d).format("DD MMM YYYY")}</span>
                                  </div>
                                );
                              },
                            },
                            {
                              title: "Actions",
                              key: "actions",
                              width: 110,
                              render: (_: any, record: any) => (
                                <Space size={6}>
                                  <Button
                                    size="small"
                                    icon={<Edit3 size={12} />}
                                    onClick={() => openEditWorkItem(record)}
                                    style={{
                                      color: "#00897b",
                                      borderColor: "#00897b",
                                      fontWeight: 500,
                                      borderRadius: 5,
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  {isProjectLead && (
                                    <Popconfirm
                                      title="Delete this task?"
                                      description="Are you sure you want to delete this work item?"
                                      onConfirm={() => handleDeleteWorkItem(record._id)}
                                      okText="Yes"
                                      cancelText="No"
                                    >
                                      <Button
                                        size="small"
                                        danger
                                        icon={<Trash2 size={12} />}
                                        style={{ borderRadius: 5 }}
                                      />
                                    </Popconfirm>
                                  )}
                                </Space>
                              ),
                            },
                          ]}
                        />
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: "todo-progress",
              label: (
                <Space size={6}>
                  <ListTodo size={14} />
                  <span>My To-Do & Progress</span>
                  {(() => {
                    const myCount = workItems.filter((w) => {
                      const aid = w.assignee?._id || w.assignee;
                      return (
                        String(aid) === String(currentUserId) &&
                        w.status !== "Done" &&
                        w.status !== "Completed"
                      );
                    }).length;
                    return myCount > 0 ? (
                      <Badge count={myCount} size="small" style={{ backgroundColor: "#00897b" }} />
                    ) : null;
                  })()}
                </Space>
              ),
              children: (
                <div style={{ padding: "12px 0" }}>
                  {/* 1. PERSONAL TO-DO SECTION */}
                  <Card
                    variant="borderless"
                    style={{
                      borderRadius: 12,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#ffffff",
                      marginBottom: 24,
                    }}
                  >
                    <div style={{ marginBottom: 20 }}>
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
                          <Title level={4} style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
                            My To-Do & Progress
                          </Title>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            Track your assigned tasks, deadlines, progress, and completed work.
                          </Text>
                        </div>
                        <Space wrap>
                          <Button
                            type="primary"
                            icon={<Plus size={14} />}
                            onClick={() => {
                              selfTaskForm.resetFields();
                              selfTaskForm.setFieldsValue({
                                priority: "Medium",
                                status: "To Do",
                                type: "Task",
                              });
                              setIsSelfTaskModalOpen(true);
                            }}
                            style={{
                              backgroundColor: "#00897b",
                              borderColor: "#00897b",
                              borderRadius: 8,
                              fontWeight: 600,
                            }}
                          >
                            Create Task for Myself
                          </Button>
                          <Tag
                            color="cyan"
                            style={{ borderRadius: 12, padding: "3px 10px", fontSize: 12 }}
                          >
                            {currentUser?.name || "Assigned Team Member"}
                          </Tag>
                        </Space>
                      </div>
                    </div>

                    {(() => {
                      const myTasks = workItems.filter((w) => {
                        const aid = w.assignee?._id || w.assignee;
                        return String(aid) === String(currentUserId);
                      });

                      const todoCount = myTasks.filter(
                        (w) => w.status === "To Do" || w.status === "Backlog"
                      ).length;
                      const inProgressTasks = myTasks.filter((w) => w.status === "In Progress");
                      const blockedTasks = myTasks.filter((w) => w.status === "Blocked");
                      const completedTasks = myTasks.filter(
                        (w) => w.status === "Done" || w.status === "Completed"
                      );
                      const overdueTasks = myTasks.filter(
                        (w) =>
                          w.dueDate &&
                          dayjs(w.dueDate).isBefore(dayjs(), "day") &&
                          w.status !== "Done" &&
                          w.status !== "Completed"
                      );

                      const myPct =
                        myTasks.length > 0
                          ? Math.round((completedTasks.length / myTasks.length) * 100)
                          : 0;

                      return (
                        <div>
                          {/* 6 Summary Metric Cards */}
                          <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                            <Col xs={12} sm={8} md={4}>
                              <Card
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Total Assigned
                                </Text>
                                <Title
                                  level={3}
                                  style={{ margin: "4px 0 0", color: "#0f172a", fontWeight: 700 }}
                                >
                                  {myTasks.length}
                                </Title>
                              </Card>
                            </Col>
                            <Col xs={12} sm={8} md={4}>
                              <Card
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  To Do
                                </Text>
                                <Title
                                  level={3}
                                  style={{ margin: "4px 0 0", color: "#64748b", fontWeight: 700 }}
                                >
                                  {todoCount}
                                </Title>
                              </Card>
                            </Col>
                            <Col xs={12} sm={8} md={4}>
                              <Card
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    color: "#1d4ed8",
                                  }}
                                >
                                  In Progress
                                </Text>
                                <Title
                                  level={3}
                                  style={{ margin: "4px 0 0", color: "#2563eb", fontWeight: 700 }}
                                >
                                  {inProgressTasks.length}
                                </Title>
                              </Card>
                            </Col>
                            <Col xs={12} sm={8} md={4}>
                              <Card
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    color: "#b91c1c",
                                  }}
                                >
                                  Blocked
                                </Text>
                                <Title
                                  level={3}
                                  style={{ margin: "4px 0 0", color: "#dc2626", fontWeight: 700 }}
                                >
                                  {blockedTasks.length}
                                </Title>
                              </Card>
                            </Col>
                            <Col xs={12} sm={8} md={4}>
                              <Card
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    color: "#15803d",
                                  }}
                                >
                                  Completed
                                </Text>
                                <Title
                                  level={3}
                                  style={{ margin: "4px 0 0", color: "#16a34a", fontWeight: 700 }}
                                >
                                  {completedTasks.length}
                                </Title>
                              </Card>
                            </Col>
                            <Col xs={12} sm={8} md={4}>
                              <Card
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  background: "#fff7ed",
                                  border: "1px solid #fed7aa",
                                  textAlign: "center",
                                }}
                              >
                                <Text
                                  type="secondary"
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    color: "#c2410c",
                                  }}
                                >
                                  Overdue
                                </Text>
                                <Title
                                  level={3}
                                  style={{ margin: "4px 0 0", color: "#ea580c", fontWeight: 700 }}
                                >
                                  {overdueTasks.length}
                                </Title>
                              </Card>
                            </Col>
                          </Row>

                          {/* Overall Progress Section */}
                          <div
                            style={{
                              marginBottom: 24,
                              background: "#f8fafc",
                              padding: "16px 20px",
                              borderRadius: 10,
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                                flexWrap: "wrap",
                                gap: 8,
                              }}
                            >
                              <div>
                                <Text strong style={{ fontSize: 14, color: "#0f172a" }}>
                                  Overall Completion
                                </Text>
                                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                                  ({completedTasks.length} of {myTasks.length} tasks completed)
                                </Text>
                              </div>
                              <span
                                style={{
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: myPct === 100 ? "#16a34a" : "#00897b",
                                }}
                              >
                                {myPct}%
                              </span>
                            </div>
                            <Progress
                              percent={myPct}
                              strokeColor={myPct === 100 ? "#16a34a" : "#00897b"}
                              status={myPct === 100 ? "success" : "active"}
                              strokeWidth={10}
                              style={{ borderRadius: 6 }}
                            />
                          </div>

                          {/* Task Organization / Filter Pills */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 16,
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <Radio.Group
                              value={todoStatusFilter}
                              onChange={(e) => setTodoStatusFilter(e.target.value)}
                              size="middle"
                              buttonStyle="solid"
                            >
                              <Radio.Button value="all">All ({myTasks.length})</Radio.Button>
                              <Radio.Button value="todo">To Do ({todoCount})</Radio.Button>
                              <Radio.Button value="inprogress">
                                In Progress ({inProgressTasks.length})
                              </Radio.Button>
                              <Radio.Button value="blocked">
                                Blocked ({blockedTasks.length})
                              </Radio.Button>
                              <Radio.Button value="completed">
                                Completed ({completedTasks.length})
                              </Radio.Button>
                              <Radio.Button value="overdue">
                                Overdue ({overdueTasks.length})
                              </Radio.Button>
                            </Radio.Group>
                          </div>

                          {/* Task Cards List (NO CHECKBOXES, Status Dropdown is the primary control) */}
                          {(() => {
                            const displayedTasks = myTasks.filter((w) => {
                              if (todoStatusFilter === "todo")
                                return w.status === "To Do" || w.status === "Backlog";
                              if (todoStatusFilter === "inprogress")
                                return w.status === "In Progress";
                              if (todoStatusFilter === "blocked") return w.status === "Blocked";
                              if (todoStatusFilter === "completed")
                                return w.status === "Done" || w.status === "Completed";
                              if (todoStatusFilter === "overdue")
                                return (
                                  w.dueDate &&
                                  dayjs(w.dueDate).isBefore(dayjs(), "day") &&
                                  w.status !== "Done" &&
                                  w.status !== "Completed"
                                );
                              return true;
                            });

                            if (displayedTasks.length === 0) {
                              return (
                                <div
                                  style={{
                                    textAlign: "center",
                                    padding: "40px 0",
                                    background: "#f8fafc",
                                    borderRadius: 10,
                                    border: "1px dashed #cbd5e1",
                                  }}
                                >
                                  <CheckCircle
                                    size={36}
                                    color="#94a3b8"
                                    style={{ margin: "0 auto 8px" }}
                                  />
                                  <Title level={5} style={{ color: "#475569", margin: 0 }}>
                                    No tasks found
                                  </Title>
                                  <Text type="secondary">No tasks match the selected filter.</Text>
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {displayedTasks.map((item) => {
                                  const isDone =
                                    item.status === "Done" || item.status === "Completed";
                                  const isOverdue =
                                    item.dueDate &&
                                    dayjs(item.dueDate).isBefore(dayjs(), "day") &&
                                    !isDone;
                                  const displayStatus =
                                    item.status === "Done" ? "Completed" : item.status;

                                  return (
                                    <Card
                                      key={item._id}
                                      size="small"
                                      style={{
                                        borderRadius: 10,
                                        border: isDone
                                          ? "1px solid #e2e8f0"
                                          : isOverdue
                                            ? "1px solid #fed7aa"
                                            : "1px solid #cbd5e1",
                                        backgroundColor: isDone
                                          ? "#f8fafc"
                                          : isOverdue
                                            ? "#fffaf5"
                                            : "#ffffff",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                        transition: "all 0.2s ease",
                                      }}
                                      styles={{ body: { padding: "14px 18px" } }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "flex-start",
                                          gap: 16,
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {/* Left Info */}
                                        <div style={{ flex: 1, minWidth: 260 }}>
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 8,
                                              flexWrap: "wrap",
                                              marginBottom: 6,
                                            }}
                                          >
                                            <Text
                                              strong
                                              style={{
                                                fontSize: 15,
                                                color: isDone ? "#64748b" : "#0f172a",
                                              }}
                                            >
                                              {item.title}
                                            </Text>
                                            <Tag
                                              color={
                                                item.type === "Bug"
                                                  ? "red"
                                                  : item.type === "Feature"
                                                    ? "cyan"
                                                    : "blue"
                                              }
                                              style={{ borderRadius: 6, margin: 0, fontSize: 11 }}
                                            >
                                              {item.type || "Task"}
                                            </Tag>
                                            <Tag
                                              color={getPriorityColor(item.priority)}
                                              style={{ borderRadius: 6, margin: 0, fontSize: 11 }}
                                            >
                                              {item.priority} Priority
                                            </Tag>
                                            {isOverdue && (
                                              <Tag
                                                color="error"
                                                style={{
                                                  borderRadius: 6,
                                                  margin: 0,
                                                  fontSize: 11,
                                                  fontWeight: 600,
                                                }}
                                              >
                                                Overdue
                                              </Tag>
                                            )}
                                          </div>

                                          {item.description && (
                                            <div
                                              style={{
                                                fontSize: 13,
                                                color: "#475569",
                                                marginBottom: 8,
                                                lineHeight: "18px",
                                              }}
                                            >
                                              {item.description}
                                            </div>
                                          )}

                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 16,
                                              flexWrap: "wrap",
                                              fontSize: 12,
                                              color: "#64748b",
                                            }}
                                          >
                                            <div>
                                              <span style={{ fontWeight: 500, color: "#334155" }}>
                                                Project:{" "}
                                              </span>
                                              {project.title || "Client Project"}
                                            </div>
                                            {item.dueDate && (
                                              <div>
                                                <span
                                                  style={{
                                                    fontWeight: 500,
                                                    color: isOverdue ? "#dc2626" : "#334155",
                                                  }}
                                                >
                                                  Due:{" "}
                                                </span>
                                                <span
                                                  style={{
                                                    color: isOverdue ? "#dc2626" : "#475569",
                                                    fontWeight: isOverdue ? 600 : 400,
                                                  }}
                                                >
                                                  {dayjs(item.dueDate).format("DD MMM YYYY")}
                                                </span>
                                              </div>
                                            )}
                                            {item.sprint?.name && (
                                              <Tag
                                                color="geekblue"
                                                style={{ borderRadius: 4, margin: 0, fontSize: 10 }}
                                              >
                                                {item.sprint.name}
                                              </Tag>
                                            )}
                                          </div>
                                        </div>

                                        {/* Right Controls: Primary Status Dropdown and Details */}
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            flexShrink: 0,
                                          }}
                                        >
                                          <div>
                                            <div
                                              style={{
                                                fontSize: 10,
                                                color: "#94a3b8",
                                                textTransform: "uppercase",
                                                fontWeight: 600,
                                                marginBottom: 2,
                                              }}
                                            >
                                              Status
                                            </div>
                                            <Select
                                              size="middle"
                                              value={displayStatus}
                                              onChange={(newStatus) => {
                                                const targetDbStatus =
                                                  newStatus === "Completed" ? "Done" : newStatus;
                                                const newProg =
                                                  newStatus === "Completed" || newStatus === "Done"
                                                    ? 100
                                                    : newStatus === "In Progress"
                                                      ? 50
                                                      : 0;
                                                handleUpdateWorkItem(item._id, {
                                                  status: targetDbStatus,
                                                  progress: newProg,
                                                });
                                              }}
                                              style={{ width: 140 }}
                                              options={[
                                                { label: "Backlog", value: "Backlog" },
                                                { label: "To Do", value: "To Do" },
                                                { label: "In Progress", value: "In Progress" },
                                                { label: "Blocked", value: "Blocked" },
                                                { label: "Completed", value: "Completed" },
                                              ]}
                                            />
                                          </div>

                                          <Button
                                            size="middle"
                                            onClick={() => {
                                              setSelectedWorkItem(item);
                                              setWorkItemDetailOpen(true);
                                            }}
                                            style={{ marginTop: 14 }}
                                          >
                                            Details
                                          </Button>
                                          <Button
                                            size="middle"
                                            icon={<Edit3 size={13} />}
                                            onClick={() => openEditWorkItem(item)}
                                            style={{
                                              marginTop: 14,
                                              color: "#00897b",
                                              borderColor: "#00897b",
                                              fontWeight: 500,
                                            }}
                                          >
                                            Edit
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })()}
                  </Card>

                  {/* 2. PROJECT MANAGER: TEAM PROGRESS DASHBOARD */}

                  {isProjectLead && (
                    <Card
                      variant="borderless"
                      style={{
                        borderRadius: 12,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        border: "1px solid #dbeafe",
                        backgroundColor: "#f8fafc",
                      }}
                      title={
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <Space size={8}>
                            <Crown size={20} color="#f59e0b" />
                            <Text strong style={{ fontSize: 16 }}>
                              Project Manager: Team Delivery & Performance Progress
                            </Text>
                          </Space>
                          <Button
                            type="primary"
                            icon={<Plus size={14} />}
                            onClick={() => setIsWorkItemModalOpen(true)}
                            style={{ backgroundColor: "#00897b", border: "none" }}
                          >
                            Assign New Task
                          </Button>
                        </div>
                      }
                    >
                      {/* Overall Team Delivery Metrics */}
                      {(() => {
                        const totalItems = workItems.length;
                        const doneItems = workItems.filter((w) => w.status === "Done").length;
                        const inProgItems = workItems.filter(
                          (w) => w.status === "In Progress"
                        ).length;
                        const blockedItems = workItems.filter((w) => w.status === "Blocked").length;
                        const overallPct =
                          totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

                        return (
                          <div>
                            <div
                              style={{
                                background: "#fff",
                                padding: "16px 20px",
                                borderRadius: 8,
                                border: "1px solid #e2e8f0",
                                marginBottom: 20,
                              }}
                            >
                              <Row gutter={[24, 16]} align="middle">
                                <Col xs={24} md={8}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    OVERALL PROJECT PROGRESS
                                  </Text>
                                  <Title
                                    level={3}
                                    style={{ margin: "4px 0 6px", color: "#00897b" }}
                                  >
                                    {overallPct}%
                                  </Title>
                                  <Progress
                                    percent={overallPct}
                                    strokeColor="#00897b"
                                    size="small"
                                  />
                                </Col>
                                <Col xs={24} md={16}>
                                  <Row gutter={[16, 12]}>
                                    <Col span={6}>
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 11, display: "block" }}
                                      >
                                        TOTAL TASKS
                                      </Text>
                                      <Text strong style={{ fontSize: 18 }}>
                                        {totalItems}
                                      </Text>
                                    </Col>
                                    <Col span={6}>
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 11, display: "block" }}
                                      >
                                        COMPLETED
                                      </Text>
                                      <Text strong style={{ fontSize: 18, color: "#52c41a" }}>
                                        {doneItems}
                                      </Text>
                                    </Col>
                                    <Col span={6}>
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 11, display: "block" }}
                                      >
                                        IN PROGRESS
                                      </Text>
                                      <Text strong style={{ fontSize: 18, color: "#1890ff" }}>
                                        {inProgItems}
                                      </Text>
                                    </Col>
                                    <Col span={6}>
                                      <Text
                                        type="secondary"
                                        style={{ fontSize: 11, display: "block" }}
                                      >
                                        BLOCKED
                                      </Text>
                                      <Text strong style={{ fontSize: 18, color: "#ff4d4f" }}>
                                        {blockedItems}
                                      </Text>
                                    </Col>
                                  </Row>
                                </Col>
                              </Row>
                            </div>

                            {/* Member Progress Cards */}
                            <Title level={5} style={{ marginBottom: 12 }}>
                              <Space size={6}>
                                <UsersIcon size={16} />
                                <span>Individual Team Member Progress</span>
                              </Space>
                            </Title>
                            <Row gutter={[16, 16]}>
                              {projectTeamMembers.map((member: any) => {
                                const memberTasks = workItems.filter((w) => {
                                  const aid = w.assignee?._id || w.assignee;
                                  return String(aid) === String(member._id);
                                });
                                const mDone = memberTasks.filter((w) => w.status === "Done").length;
                                const mInProg = memberTasks.filter(
                                  (w) => w.status === "In Progress"
                                ).length;
                                const mBlocked = memberTasks.filter(
                                  (w) => w.status === "Blocked"
                                ).length;
                                const mPct =
                                  memberTasks.length > 0
                                    ? Math.round((mDone / memberTasks.length) * 100)
                                    : 0;
                                const isLeadMember = String(member._id) === String(techOwnerId);

                                return (
                                  <Col xs={24} md={12} lg={8} key={member._id}>
                                    <Card
                                      size="small"
                                      style={{
                                        borderRadius: 10,
                                        border: isLeadMember
                                          ? "1px solid #cbd5e1"
                                          : "1px solid #f1f5f9",
                                        backgroundColor: "#fff",
                                        boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: 8,
                                        }}
                                      >
                                        <Space size={8}>
                                          <Avatar
                                            icon={<UserIcon size={14} />}
                                            style={{
                                              backgroundColor: isLeadMember ? "#f59e0b" : "#00897b",
                                            }}
                                          />
                                          <div>
                                            <Text strong style={{ fontSize: 13 }}>
                                              {member.name}
                                            </Text>
                                            <div>
                                              <Tag
                                                color={isLeadMember ? "gold" : "blue"}
                                                style={{ fontSize: 9, lineHeight: "14px" }}
                                              >
                                                {isLeadMember
                                                  ? "Project Manager"
                                                  : member.role || "Member"}
                                              </Tag>
                                            </div>
                                          </div>
                                        </Space>
                                        <Text
                                          strong
                                          style={{
                                            fontSize: 14,
                                            color: mPct === 100 ? "#52c41a" : "#00897b",
                                          }}
                                        >
                                          {mPct}%
                                        </Text>
                                      </div>

                                      <Progress
                                        percent={mPct}
                                        strokeColor={mPct === 100 ? "#52c41a" : "#00897b"}
                                        size="small"
                                        style={{ marginBottom: 8 }}
                                      />

                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          fontSize: 11,
                                          color: "#64748b",
                                          marginBottom: 8,
                                        }}
                                      >
                                        <span>
                                          Done:{" "}
                                          <strong style={{ color: "#52c41a" }}>{mDone}</strong>
                                        </span>
                                        <span>
                                          In Progress:{" "}
                                          <strong style={{ color: "#1890ff" }}>{mInProg}</strong>
                                        </span>
                                        <span>
                                          Blocked:{" "}
                                          <strong style={{ color: "#ff4d4f" }}>{mBlocked}</strong>
                                        </span>
                                        <span>
                                          Total: <strong>{memberTasks.length}</strong>
                                        </span>
                                      </div>

                                      {/* Task preview list */}
                                      {memberTasks.length > 0 ? (
                                        <div
                                          style={{
                                            maxHeight: 120,
                                            overflowY: "auto",
                                            borderTop: "1px solid #f8fafc",
                                            paddingTop: 6,
                                          }}
                                        >
                                          {memberTasks.map((t) => (
                                            <div
                                              key={t._id}
                                              style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "3px 0",
                                                fontSize: 11,
                                              }}
                                            >
                                              <div
                                                onClick={() => {
                                                  setSelectedWorkItem(t);
                                                  setWorkItemDetailOpen(true);
                                                }}
                                                style={{
                                                  flex: 1,
                                                  minWidth: 0,
                                                  cursor: "pointer",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 4,
                                                  paddingRight: 6,
                                                }}
                                              >
                                                <Text
                                                  ellipsis
                                                  style={{ fontSize: 11, color: "#1e293b" }}
                                                >
                                                  {t.title}
                                                </Text>
                                                <Tag
                                                  color={
                                                    t.status === "Done"
                                                      ? "success"
                                                      : t.status === "In Progress"
                                                        ? "processing"
                                                        : t.status === "Blocked"
                                                          ? "error"
                                                          : "default"
                                                  }
                                                  style={{ fontSize: 9, margin: 0 }}
                                                >
                                                  {t.status}
                                                </Tag>
                                              </div>
                                              <Button
                                                size="small"
                                                type="text"
                                                icon={<Edit3 size={12} color="#00897b" />}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  openEditWorkItem(t);
                                                }}
                                                title="Edit Task"
                                                style={{
                                                  height: 22,
                                                  width: 22,
                                                  padding: 0,
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <Text
                                          type="secondary"
                                          style={{
                                            fontSize: 11,
                                            fontStyle: "italic",
                                            display: "block",
                                            textAlign: "center",
                                            paddingTop: 6,
                                          }}
                                        >
                                          No tasks assigned
                                        </Text>
                                      )}
                                    </Card>
                                  </Col>
                                );
                              })}
                            </Row>
                          </div>
                        );
                      })()}
                    </Card>
                  )}
                </div>
              ),
            },
            {
              key: "chat",
              label: (
                <Space size={6}>
                  <MessageSquare size={14} />
                  <span>Project Chat</span>
                  <Badge count="Live" style={{ backgroundColor: "#25D366", fontSize: 10 }} />
                </Space>
              ),
              children: (
                <div style={{ padding: "12px 0" }}>
                  <Row gutter={[20, 20]}>
                    {/* WhatsApp Messages Board */}
                    <Col xs={24} lg={18}>
                      <Card
                        size="small"
                        styles={{ body: { padding: 0 } }}
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          border: "1px solid #dcdad5",
                          boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                        }}
                      >
                        {/* WhatsApp Chat Header */}
                        <div
                          style={{
                            padding: "10px 16px",
                            backgroundColor: "#075e54",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <Space size={10}>
                            <Avatar style={{ backgroundColor: "#128c7e", color: "#fff" }}>
                              {project.title ? project.title.charAt(0).toUpperCase() : "P"}
                            </Avatar>
                            <div>
                              <Text
                                strong
                                style={{ color: "#fff", fontSize: 14, display: "block" }}
                              >
                                {project.title} - Team Chat
                              </Text>
                              <span style={{ fontSize: 11, color: "#d1fae5" }}>
                                ● Live realtime updates &bull; {projectTeamMembers.length} members
                              </span>
                            </div>
                          </Space>
                          <Tag
                            color="#128c7e"
                            style={{ border: "none", color: "#fff", fontSize: 11 }}
                          >
                            Real-time
                          </Tag>
                        </div>

                        {/* WhatsApp Messages Scrollable Area */}
                        <div
                          ref={chatContainerRef}
                          style={{
                            height: 440,
                            overflowY: "auto",
                            padding: "16px 20px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            backgroundColor: "#efeae2",
                            backgroundImage: "radial-gradient(#e0d9cf 1px, transparent 1px)",
                            backgroundSize: "16px 16px",
                          }}
                        >
                          {chatMessages.length === 0 ? (
                            <div style={{ textAlign: "center", marginTop: 120 }}>
                              <div
                                style={{
                                  display: "inline-block",
                                  padding: "10px 18px",
                                  backgroundColor: "#fff",
                                  borderRadius: 16,
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                                }}
                              >
                                <MessageSquare
                                  size={24}
                                  color="#075e54"
                                  style={{ margin: "0 auto 6px" }}
                                />
                                <Text style={{ fontSize: 12, color: "#555", display: "block" }}>
                                  No messages in this project yet.
                                </Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                  Start chatting with your team or share project files!
                                </Text>
                              </div>
                            </div>
                          ) : (
                            chatMessages.map((msg) => {
                              const isMe =
                                String(msg.senderId?._id || msg.senderId) === String(currentUserId);
                              const senderName = msg.senderId?.name || "Team Member";
                              const senderRole = msg.senderId?.role || "Member";
                              const isLead =
                                String(msg.senderId?._id || msg.senderId) === String(techOwnerId);

                              // Collect all attachments (both schema array and legacy single attachment)
                              const allAttachments = [...(msg.attachments || [])];
                              if (
                                msg.attachment?.url &&
                                !allAttachments.some((a) => a.path === msg.attachment.url)
                              ) {
                                allAttachments.push({
                                  name: msg.attachment.name || "Attachment",
                                  path: msg.attachment.url,
                                  mimeType: "application/octet-stream",
                                  size: 0,
                                });
                              }

                              return (
                                <div
                                  key={msg._id}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignSelf: isMe ? "flex-end" : "flex-start",
                                    maxWidth: "80%",
                                    minWidth: "160px",
                                  }}
                                >
                                  <div
                                    style={{
                                      backgroundColor: isMe ? "#d9fdd3" : "#ffffff",
                                      border: isMe ? "1px solid #c7f0bf" : "1px solid #e9edef",
                                      borderRadius: isMe
                                        ? "12px 12px 2px 12px"
                                        : "12px 12px 12px 2px",
                                      padding: "8px 12px",
                                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                    }}
                                  >
                                    {/* Sender info (for incoming messages) */}
                                    {!isMe && (
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 6,
                                          marginBottom: 4,
                                        }}
                                      >
                                        <Text strong style={{ fontSize: 12, color: "#075e54" }}>
                                          {senderName}
                                        </Text>
                                        <Tag
                                          color={
                                            isLead
                                              ? "gold"
                                              : senderRole === "TECH_TEAM" ||
                                                  senderRole === "TECH_MANAGER"
                                                ? "blue"
                                                : "default"
                                          }
                                          style={{ fontSize: 9, margin: 0, lineHeight: "14px" }}
                                        >
                                          {isLead ? "Project Manager" : senderRole}
                                        </Tag>
                                      </div>
                                    )}

                                    {/* Text Message Content */}
                                    {msg.message && (
                                      <div
                                        style={{
                                          fontSize: 13,
                                          color: "#111b21",
                                          whiteSpace: "pre-wrap",
                                          wordBreak: "break-word",
                                          lineHeight: "18px",
                                        }}
                                      >
                                        {msg.message}
                                      </div>
                                    )}

                                    {/* Mentions */}
                                    {msg.mentions && msg.mentions.length > 0 && (
                                      <div
                                        style={{
                                          marginTop: 4,
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: 4,
                                        }}
                                      >
                                        {msg.mentions.map((m: any) => {
                                          const isSysAdmin =
                                            m.role === "SYSTEM_ADMIN" || m.role === "ADMIN";
                                          return (
                                            <Tag
                                              key={m._id}
                                              color={isSysAdmin ? "purple" : "cyan"}
                                              style={{ fontSize: 10, margin: 0, fontWeight: 500 }}
                                            >
                                              @{m.name} {isSysAdmin ? "(Admin)" : ""}
                                            </Tag>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Attachments & Documents */}
                                    {allAttachments.length > 0 && (
                                      <div
                                        style={{
                                          marginTop: 6,
                                          display: "flex",
                                          flexDirection: "column",
                                          gap: 6,
                                        }}
                                      >
                                        {allAttachments.map((att: any, idx: number) => {
                                          const isImg =
                                            att.mimeType?.startsWith("image/") ||
                                            /\.(jpg|jpeg|png|gif|webp)$/i.test(
                                              att.name || att.path
                                            );
                                          if (isImg) {
                                            return (
                                              <div
                                                key={idx}
                                                style={{
                                                  borderRadius: 6,
                                                  overflow: "hidden",
                                                  cursor: "pointer",
                                                }}
                                                onClick={() => window.open(att.path, "_blank")}
                                              >
                                                <img
                                                  src={att.path}
                                                  alt={att.name}
                                                  style={{
                                                    maxWidth: "100%",
                                                    maxHeight: 200,
                                                    objectFit: "cover",
                                                    display: "block",
                                                    borderRadius: 6,
                                                  }}
                                                />
                                                <div
                                                  style={{
                                                    fontSize: 10,
                                                    color: "#666",
                                                    marginTop: 2,
                                                  }}
                                                >
                                                  {att.name}
                                                </div>
                                              </div>
                                            );
                                          }

                                          return (
                                            <div
                                              key={idx}
                                              onClick={() => window.open(att.path, "_blank")}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 8,
                                                padding: "6px 10px",
                                                backgroundColor: isMe ? "#cbf0c2" : "#f4f6f8",
                                                borderRadius: 6,
                                                cursor: "pointer",
                                                border: "1px solid rgba(0,0,0,0.06)",
                                              }}
                                            >
                                              <FileText size={20} color="#075e54" />
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <Text
                                                  strong
                                                  ellipsis
                                                  style={{ fontSize: 12, display: "block" }}
                                                >
                                                  {att.name}
                                                </Text>
                                                <Text type="secondary" style={{ fontSize: 10 }}>
                                                  {att.size
                                                    ? `${(att.size / 1024).toFixed(0)} KB`
                                                    : "Document"}{" "}
                                                  &bull; Click to download
                                                </Text>
                                              </div>
                                              <Download size={14} color="#555" />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Timestamp & Status */}
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "flex-end",
                                        alignItems: "center",
                                        gap: 2,
                                        marginTop: 4,
                                      }}
                                    >
                                      <span style={{ fontSize: 10, color: "#667781" }}>
                                        {dayjs(msg.createdAt).format("h:mm A")}
                                      </span>
                                      {isMe && (
                                        <CheckCheck
                                          size={13}
                                          color="#53bdeb"
                                          style={{ marginLeft: 2 }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div ref={chatBottomRef} />
                        </div>

                        {/* WhatsApp Input Panel */}
                        <div
                          style={{
                            padding: "10px 14px",
                            borderTop: "1px solid #e0e0e0",
                            backgroundColor: "#f0f2f5",
                          }}
                        >
                          <form onSubmit={handleSendChatMessage}>
                            <Row gutter={8} align="middle">
                              <Col flex="36px">
                                <Upload
                                  customRequest={handleChatFileUpload}
                                  showUploadList={false}
                                  disabled={chatUploading}
                                >
                                  <Button
                                    shape="circle"
                                    icon={<Paperclip size={16} />}
                                    loading={chatUploading}
                                    title="Attach document or file"
                                  />
                                </Upload>
                              </Col>
                              <Col flex="auto">
                                <Input
                                  placeholder="Type a message or press Enter to send..."
                                  value={chatInput}
                                  onChange={(e) => setChatInput(e.target.value)}
                                  style={{ borderRadius: 20, padding: "6px 16px" }}
                                />
                              </Col>
                              <Col flex="180px">
                                <Select
                                  mode="multiple"
                                  style={{ width: "100%" }}
                                  placeholder="@mention admin/team"
                                  maxTagCount={1}
                                  value={chatMentions}
                                  onChange={setChatMentions}
                                  options={chatMentionOptions}
                                  optionFilterProp="label"
                                />
                              </Col>
                              <Col flex="40px">
                                <Button
                                  type="primary"
                                  shape="circle"
                                  htmlType="submit"
                                  icon={<Send size={16} />}
                                  style={{ backgroundColor: "#075e54", borderColor: "#075e54" }}
                                />
                              </Col>
                            </Row>

                            {/* Chat file attachment staged pill */}
                            {chatFile && (
                              <div
                                style={{
                                  marginTop: 8,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 8,
                                  backgroundColor: "#e8f5e9",
                                  padding: "4px 10px",
                                  borderRadius: 16,
                                  border: "1px solid #c8e6c9",
                                }}
                              >
                                <Paperclip size={12} color="#2e7d32" />
                                <Text style={{ fontSize: 11, color: "#2e7d32" }}>
                                  Ready to share: <strong>{chatFile.name}</strong>
                                </Text>
                                <Button
                                  size="small"
                                  type="link"
                                  danger
                                  onClick={() => setChatFile(null)}
                                  style={{ padding: 0 }}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </form>
                        </div>
                      </Card>
                    </Col>

                    {/* Right Column: Project Members & Roles */}
                    <Col xs={24} lg={6}>
                      <Card
                        size="small"
                        title="Project Team"
                        style={{ borderRadius: 12, border: "1px solid #e8e8e8" }}
                        extra={
                          currentUser?.role === "SYSTEM_ADMIN" ? (
                            <Button
                              type="link"
                              size="small"
                              onClick={openTeamModal}
                              style={{ padding: 0, color: "#00897b", fontWeight: 600 }}
                            >
                              Manage
                            </Button>
                          ) : null
                        }
                      >
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {[
                            {
                              name: project.techOwner?.name,
                              role: "Project Manager",
                              email: project.techOwner?.email,
                              isLead: true,
                            },
                            ...(project.techTeamMembers?.map((m: any) => ({
                              name: m.name,
                              role: m.role || "Developer",
                              email: m.email,
                              isLead: false,
                            })) || []),
                            {
                              name: project.createdBy?.name,
                              role: "Sales Owner",
                              email: project.createdBy?.email,
                              isLead: false,
                            },
                          ]
                            .filter((member) => member.name)
                            .map((item, idx, arr) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  padding: "8px 0",
                                  borderBottom:
                                    idx === arr.length - 1 ? "none" : "1px solid #f0f0f0",
                                }}
                              >
                                <Avatar
                                  icon={<UserIcon size={12} />}
                                  style={{ backgroundColor: item.isLead ? "#f59e0b" : "#00897b" }}
                                />
                                <div style={{ display: "flex", flexDirection: "column" }}>
                                  <Text strong style={{ fontSize: 12 }}>
                                    {item.name}
                                  </Text>
                                  <div>
                                    <Tag
                                      color={item.isLead ? "gold" : "blue"}
                                      style={{ fontSize: 9, margin: 0 }}
                                    >
                                      {item.role}
                                    </Tag>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </Card>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: "calendar",
              label: (
                <Space size={6}>
                  <CalendarIcon size={14} />
                  <span>Project Calendar</span>
                </Space>
              ),
              children: (
                <div style={{ padding: "12px 0" }}>
                  <Card
                    variant="borderless"
                    style={{
                      borderRadius: 12,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      border: "1px solid #e5e7eb",
                      marginBottom: 20,
                    }}
                    title={
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <Space size={8}>
                          <CalendarIcon size={18} color="#00897b" />
                          <div>
                            <Text strong style={{ fontSize: 16, display: "block" }}>
                              Project Calendar
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: "normal" }}>
                              View project deadlines, meetings, tasks, and important events.
                            </Text>
                          </div>
                        </Space>
                        <Space wrap>
                          <Button size="small" onClick={() => setProjectCalendarMonth(dayjs())}>
                            Today
                          </Button>
                          <Button
                            size="small"
                            onClick={() =>
                              setProjectCalendarMonth(projectCalendarMonth.subtract(1, "month"))
                            }
                          >
                            &lt;
                          </Button>
                          <Text
                            strong
                            style={{
                              minWidth: 110,
                              textAlign: "center",
                              display: "inline-block",
                              fontSize: 13,
                            }}
                          >
                            {projectCalendarMonth.format("MMMM YYYY")}
                          </Text>
                          <Button
                            size="small"
                            onClick={() =>
                              setProjectCalendarMonth(projectCalendarMonth.add(1, "month"))
                            }
                          >
                            &gt;
                          </Button>
                        </Space>
                      </div>
                    }
                  >
                    {/* Legend & Categories */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        marginBottom: 16,
                        flexWrap: "wrap",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
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
                          <Text type="secondary" style={{ color: "#dc2626", fontWeight: 500 }}>
                            Official Holiday (All Sundays, 2nd & 4th Sat)
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
                          <Text type="secondary">Task Due</Text>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: "#52c41a",
                              display: "inline-block",
                            }}
                          />
                          <Text type="secondary">Sprint Milestone</Text>
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
                          <Text type="secondary">Personal Task</Text>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              backgroundColor: "#ea580c",
                              display: "inline-block",
                            }}
                          />
                          <Text type="secondary">Overdue Deadline</Text>
                        </div>
                      </div>
                    </div>

                    <Row gutter={[16, 16]}>
                      <Col xs={24} lg={18}>
                        {/* Calendar Grid */}
                        {(() => {
                          const startOfMonth = projectCalendarMonth.startOf("month");
                          const endOfMonth = projectCalendarMonth.endOf("month");
                          const startDate = startOfMonth.startOf("week");
                          const endDate = endOfMonth.endOf("week");

                          const days = [];
                          let d = startDate;
                          while (d.isBefore(endDate)) {
                            days.push(d);
                            d = d.add(1, "day");
                          }

                          return (
                            <div
                              style={{
                                border: "1px solid #f0f0f0",
                                borderRadius: 8,
                                overflow: "hidden",
                              }}
                            >
                              {/* Day headers */}
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(7, 1fr)",
                                  backgroundColor: "#fafafa",
                                  borderBottom: "1px solid #f0f0f0",
                                }}
                              >
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                                  (dayName, idx) => {
                                    const isSun = idx === 0;
                                    const isSat = idx === 6;
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: "8px 0",
                                          textAlign: "center",
                                          fontWeight: 600,
                                          color: isSun ? "#dc2626" : isSat ? "#ea580c" : "#64748b",
                                          backgroundColor: isSun
                                            ? "#fef2f2"
                                            : isSat
                                              ? "#fffbeb"
                                              : "transparent",
                                          fontSize: 12,
                                        }}
                                      >
                                        {dayName}
                                      </div>
                                    );
                                  }
                                )}
                              </div>

                              {/* Cells */}
                              <div
                                style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
                              >
                                {days.map((dayDate, idx) => {
                                  const isCurrentMonth = dayDate.isSame(
                                    projectCalendarMonth,
                                    "month"
                                  );
                                  const isToday = dayDate.isSame(dayjs(), "day");

                                  // Holiday calculation: All Sundays, plus 2nd and 4th Saturdays
                                  const dayOfWeek = dayDate.day(); // 0 = Sun, 6 = Sat
                                  const isSunday = dayOfWeek === 0;
                                  const dayOfMonth = dayDate.date();
                                  const weekNum = Math.ceil(dayOfMonth / 7);
                                  const is2ndOr4thSat =
                                    dayOfWeek === 6 && (weekNum === 2 || weekNum === 4);
                                  const isHoliday = isSunday || is2ndOr4thSat;
                                  const holidayLabel = isSunday
                                    ? "Sunday"
                                    : `${weekNum === 2 ? "2nd" : "4th"} Sat`;

                                  // Find project work items due this day
                                  const dayWorkItems = workItems.filter(
                                    (w) => w.dueDate && dayjs(w.dueDate).isSame(dayDate, "day")
                                  );
                                  // Find sprints ending/starting this day
                                  const daySprints = sprints.filter(
                                    (s) =>
                                      dayjs(s.endDate).isSame(dayDate, "day") ||
                                      dayjs(s.startDate).isSame(dayDate, "day")
                                  );
                                  // Find personal tasks on this day
                                  const dayPersonalTasks = projectPersonalTasks.filter((t) =>
                                    dayjs(t.date).isSame(dayDate, "day")
                                  );

                                  const cellBg = !isCurrentMonth
                                    ? "#fafafa"
                                    : isHoliday
                                      ? "#fff5f5"
                                      : "#fff";

                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        minHeight: 90,
                                        borderRight:
                                          (idx + 1) % 7 !== 0 ? "1px solid #f0f0f0" : "none",
                                        borderBottom: "1px solid #f0f0f0",
                                        padding: 6,
                                        backgroundColor: cellBg,
                                        transition: "background 0.2s",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: 4,
                                        }}
                                      >
                                        <span
                                          style={{
                                            width: 22,
                                            height: 22,
                                            borderRadius: "50%",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: isToday ? "#00897b" : "transparent",
                                            color: isToday
                                              ? "#fff"
                                              : isHoliday && isCurrentMonth
                                                ? "#dc2626"
                                                : isCurrentMonth
                                                  ? "#1e293b"
                                                  : "#94a3b8",
                                            fontWeight:
                                              isToday || (isHoliday && isCurrentMonth) ? 700 : 500,
                                            fontSize: 11,
                                          }}
                                        >
                                          {dayDate.format("D")}
                                        </span>
                                        {isHoliday && isCurrentMonth && (
                                          <span
                                            style={{
                                              fontSize: 9,
                                              fontWeight: 700,
                                              color: "#dc2626",
                                              backgroundColor: "#fee2e2",
                                              padding: "1px 4px",
                                              borderRadius: 3,
                                            }}
                                          >
                                            {holidayLabel}
                                          </span>
                                        )}
                                      </div>

                                      <div
                                        style={{ display: "flex", flexDirection: "column", gap: 3 }}
                                      >
                                        {/* Personal Tasks */}
                                        {dayPersonalTasks.map((pt: any) => (
                                          <div
                                            key={pt._id}
                                            style={{
                                              backgroundColor: "#eef2ff",
                                              borderLeft: `3px solid ${pt.color || "#6366f1"}`,
                                              padding: "2px 4px",
                                              borderRadius: 3,
                                              fontSize: 10,
                                              color: "#3730a3",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                              cursor: "pointer",
                                            }}
                                            onClick={() => {
                                              personalTaskForm.setFieldsValue({
                                                ...pt,
                                                date: dayjs(pt.date),
                                              });
                                              setIsPersonalTaskModalOpen(true);
                                            }}
                                            title={`Personal Task: ${pt.title} (${pt.priority})`}
                                          >
                                            {pt.title}
                                          </div>
                                        ))}

                                        {/* Work Items */}
                                        {dayWorkItems.map((wi: any) => (
                                          <div
                                            key={wi._id}
                                            onClick={() => {
                                              setSelectedWorkItem(wi);
                                              setWorkItemDetailOpen(true);
                                            }}
                                            style={{
                                              backgroundColor: "#f0fdfa",
                                              borderLeft: `3px solid ${wi.priority === "Urgent" ? "#ff4d4f" : wi.priority === "High" ? "#fa8c16" : "#00897b"}`,
                                              padding: "2px 4px",
                                              borderRadius: 3,
                                              fontSize: 10,
                                              color: "#115e59",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                              cursor: "pointer",
                                            }}
                                            title={`Work Item: ${wi.title} (${wi.status})`}
                                          >
                                            {wi.title}
                                          </div>
                                        ))}

                                        {/* Sprints */}
                                        {daySprints.map((sp: any) => (
                                          <div
                                            key={sp._id}
                                            style={{
                                              backgroundColor: "#f6ffed",
                                              borderLeft: "3px solid #52c41a",
                                              padding: "2px 4px",
                                              borderRadius: 3,
                                              fontSize: 10,
                                              color: "#135200",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                            }}
                                            title={`Sprint Deadline: ${sp.name}`}
                                          >
                                            {sp.name}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                      </Col>

                      {/* Upcoming Events Panel */}
                      <Col xs={24} lg={6}>
                        <Card
                          size="small"
                          style={{
                            borderRadius: 10,
                            border: "1px solid #e2e8f0",
                            background: "#f8fafc",
                            height: "100%",
                          }}
                          title={
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Clock size={15} color="#00897b" />
                              <Text strong style={{ fontSize: 13 }}>
                                Upcoming Events
                              </Text>
                            </div>
                          }
                        >
                          {(() => {
                            const today = dayjs().startOf("day");
                            const upcomingItems: any[] = [];

                            // Add work items due within next 14 days
                            workItems.forEach((wi) => {
                              if (wi.dueDate && wi.status !== "Done" && wi.status !== "Completed") {
                                const d = dayjs(wi.dueDate).startOf("day");
                                const diffDays = d.diff(today, "day");
                                if (diffDays >= 0 && diffDays <= 14) {
                                  upcomingItems.push({
                                    id: wi._id,
                                    title: wi.title,
                                    type: "task",
                                    date: d,
                                    diffDays,
                                    priority: wi.priority,
                                    status: wi.status,
                                  });
                                }
                              }
                            });

                            // Add sprints ending/starting
                            sprints.forEach((sp) => {
                              if (sp.endDate) {
                                const d = dayjs(sp.endDate).startOf("day");
                                const diffDays = d.diff(today, "day");
                                if (diffDays >= 0 && diffDays <= 14) {
                                  upcomingItems.push({
                                    id: sp._id,
                                    title: `Sprint: ${sp.name}`,
                                    type: "sprint",
                                    date: d,
                                    diffDays,
                                    status: sp.status,
                                  });
                                }
                              }
                            });

                            // Add personal tasks
                            projectPersonalTasks.forEach((pt) => {
                              if (pt.date && pt.status !== "Done") {
                                const d = dayjs(pt.date).startOf("day");
                                const diffDays = d.diff(today, "day");
                                if (diffDays >= 0 && diffDays <= 14) {
                                  upcomingItems.push({
                                    id: pt._id,
                                    title: pt.title,
                                    type: "personal",
                                    date: d,
                                    diffDays,
                                    priority: pt.priority,
                                  });
                                }
                              }
                            });

                            upcomingItems.sort((a, b) => a.date.valueOf() - b.date.valueOf());

                            if (upcomingItems.length === 0) {
                              return (
                                <div
                                  style={{
                                    textAlign: "center",
                                    padding: "24px 8px",
                                    color: "#94a3b8",
                                  }}
                                >
                                  <CalendarIcon
                                    size={24}
                                    color="#cbd5e1"
                                    style={{ margin: "0 auto 8px" }}
                                  />
                                  <div style={{ fontSize: 12 }}>
                                    No upcoming deadlines in the next 14 days.
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {upcomingItems.slice(0, 7).map((ev) => {
                                  const timeLabel =
                                    ev.diffDays === 0
                                      ? "Today"
                                      : ev.diffDays === 1
                                        ? "Tomorrow"
                                        : ev.date.format("DD MMM");
                                  const isToday = ev.diffDays === 0;

                                  return (
                                    <div
                                      key={ev.id}
                                      style={{
                                        padding: "8px 10px",
                                        borderRadius: 6,
                                        background: "#ffffff",
                                        border: isToday ? "1px solid #fde68a" : "1px solid #f1f5f9",
                                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: 2,
                                        }}
                                      >
                                        <Tag
                                          color={
                                            isToday
                                              ? "gold"
                                              : ev.diffDays === 1
                                                ? "blue"
                                                : "default"
                                          }
                                          style={{
                                            fontSize: 10,
                                            margin: 0,
                                            padding: "0 6px",
                                            fontWeight: 600,
                                          }}
                                        >
                                          {timeLabel}
                                        </Tag>
                                        {ev.priority && (
                                          <Tag
                                            color={
                                              ev.priority === "Urgent"
                                                ? "red"
                                                : ev.priority === "High"
                                                  ? "orange"
                                                  : "blue"
                                            }
                                            style={{ fontSize: 9, margin: 0, padding: "0 4px" }}
                                          >
                                            {ev.priority}
                                          </Tag>
                                        )}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: "#1e293b",
                                          marginTop: 4,
                                        }}
                                      >
                                        {ev.title}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: isToday ? "#b45309" : "#64748b",
                                          marginTop: 2,
                                        }}
                                      >
                                        {isToday
                                          ? "Due today"
                                          : ev.diffDays === 1
                                            ? "Due tomorrow"
                                            : `Due in ${ev.diffDays} days`}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </Card>
                      </Col>
                    </Row>
                  </Card>
                </div>
              ),
            },
            {
              key: "drive",
              label: (
                <Space size={6}>
                  <HardDrive size={14} />
                  <span>Project Drive</span>
                  {attachments.length > 0 && (
                    <Badge
                      count={attachments.length}
                      size="small"
                      style={{ backgroundColor: "#00897b" }}
                    />
                  )}
                </Space>
              ),
              children: (
                <div style={{ padding: "12px 0" }}>
                  {/* Drive Header Bar & Breadcrumbs */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      marginBottom: 16,
                      padding: "12px 16px",
                      backgroundColor: "#f8fafc",
                      borderRadius: 10,
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    {/* Breadcrumb path */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<HardDrive size={15} color="#00897b" />}
                        onClick={() => setCurrentFolder("/")}
                        style={{ fontWeight: currentFolder === "/" ? 700 : 400, color: "#00897b" }}
                      >
                        Drive Root
                      </Button>
                      {currentFolder !== "/" &&
                        (() => {
                          const segments = currentFolder.split("/").filter(Boolean);
                          let accumulated = "";
                          return segments.map((seg, idx) => {
                            accumulated += "/" + seg;
                            const thisPath = accumulated;
                            const isLast = idx === segments.length - 1;
                            return (
                              <React.Fragment key={thisPath}>
                                <ChevronRight size={14} color="#94a3b8" />
                                <Button
                                  type="text"
                                  size="small"
                                  onClick={() => setCurrentFolder(thisPath)}
                                  style={{
                                    fontWeight: isLast ? 700 : 400,
                                    color: isLast ? "#1e293b" : "#64748b",
                                    padding: "0 4px",
                                  }}
                                >
                                  <Folder
                                    size={14}
                                    color="#f59e0b"
                                    style={{
                                      display: "inline-block",
                                      verticalAlign: "middle",
                                      marginRight: 4,
                                    }}
                                  />
                                  {seg}
                                </Button>
                              </React.Fragment>
                            );
                          });
                        })()}
                    </div>

                    {/* Drive Action Buttons */}
                    <Space size={8} wrap>
                      {currentFolder !== "/" && (
                        <Button
                          size="small"
                          icon={<ArrowUp size={13} />}
                          onClick={() => {
                            const lastSlash = currentFolder.lastIndexOf("/");
                            const parent =
                              lastSlash <= 0 ? "/" : currentFolder.substring(0, lastSlash);
                            setCurrentFolder(parent);
                          }}
                        >
                          Up One Level
                        </Button>
                      )}
                      <Button
                        size="small"
                        icon={<FolderPlus size={14} />}
                        onClick={() => setIsFolderModalOpen(true)}
                      >
                        New Folder
                      </Button>
                      <Upload
                        customRequest={handleDriveFileUpload}
                        showUploadList={false}
                        disabled={driveUploading}
                      >
                        <Button
                          type="primary"
                          size="small"
                          icon={<Plus size={14} />}
                          loading={driveUploading}
                          style={{ backgroundColor: "#00897b", border: "none" }}
                        >
                          Upload to this Folder
                        </Button>
                      </Upload>
                    </Space>
                  </div>

                  {/* Folders Section */}
                  {(() => {
                    const folders = attachments.filter((a: any) => a.isFolder);
                    const files = attachments.filter((a: any) => !a.isFolder);

                    return (
                      <div>
                        {folders.length > 0 && (
                          <div style={{ marginBottom: 20 }}>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                fontWeight: 600,
                                display: "block",
                                marginBottom: 10,
                              }}
                            >
                              Folders ({folders.length})
                            </Text>
                            <Row gutter={[12, 12]}>
                              {folders.map((f: any) => (
                                <Col xs={24} sm={12} md={8} lg={6} key={f._id}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "10px 14px",
                                      backgroundColor: "#fff",
                                      border: "1px solid #e2e8f0",
                                      borderRadius: 8,
                                      cursor: "pointer",
                                      transition: "all 0.2s ease",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                    }}
                                    onClick={() => {
                                      const nextPath =
                                        currentFolder === "/"
                                          ? `/${f.originalName}`
                                          : `${currentFolder}/${f.originalName}`;
                                      setCurrentFolder(nextPath);
                                    }}
                                  >
                                    <Space size={10} style={{ minWidth: 0, flex: 1 }}>
                                      <Folder
                                        size={22}
                                        color="#f59e0b"
                                        fill="#fef3c7"
                                        style={{ flexShrink: 0 }}
                                      />
                                      <Text
                                        strong
                                        ellipsis
                                        style={{ fontSize: 13, color: "#1e293b" }}
                                      >
                                        {f.originalName}
                                      </Text>
                                    </Space>
                                    <Popconfirm
                                      title="Delete Folder"
                                      description="Delete this folder and all contents inside?"
                                      onConfirm={(e) => {
                                        e?.stopPropagation();
                                        handleDeleteAttachment(f._id);
                                      }}
                                      onCancel={(e) => e?.stopPropagation()}
                                      okText="Delete"
                                      cancelText="Cancel"
                                    >
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<Trash2 size={13} />}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ padding: "0 4px" }}
                                      />
                                    </Popconfirm>
                                  </div>
                                </Col>
                              ))}
                            </Row>
                          </div>
                        )}

                        {/* Files Table Section */}
                        <div>
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 12,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              fontWeight: 600,
                              display: "block",
                              marginBottom: 10,
                            }}
                          >
                            Files in {currentFolder === "/" ? "Root" : currentFolder} (
                            {files.length})
                          </Text>
                          {files.length === 0 && folders.length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "40px 0",
                                backgroundColor: "#fff",
                                borderRadius: 8,
                                border: "1px dashed #d9d9d9",
                              }}
                            >
                              <HardDrive
                                size={36}
                                color="#cbd5e1"
                                style={{ margin: "0 auto 8px" }}
                              />
                              <Paragraph style={{ color: "#64748b", margin: 0 }}>
                                This folder is empty.
                              </Paragraph>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                Create a subfolder or upload documents above.
                              </Text>
                            </div>
                          ) : (
                            <Table
                              dataSource={files}
                              rowKey="_id"
                              size="small"
                              pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                              columns={[
                                {
                                  title: "File Name",
                                  dataIndex: "originalName",
                                  key: "originalName",
                                  render: (name: string, record: any) => (
                                    <Space size={8}>
                                      {record.mimeType?.includes("pdf") ? (
                                        <FilePdfOutlined
                                          style={{ color: "#ef4444", fontSize: 16 }}
                                        />
                                      ) : (
                                        <FileText size={16} color="#00897b" />
                                      )}
                                      <Text strong style={{ fontSize: 13 }}>
                                        {name}
                                      </Text>
                                    </Space>
                                  ),
                                },
                                {
                                  title: "Size",
                                  dataIndex: "size",
                                  key: "size",
                                  width: 110,
                                  render: (bytes: number) => {
                                    if (!bytes) return "0 KB";
                                    return bytes > 1024 * 1024
                                      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
                                      : `${(bytes / 1024).toFixed(1)} KB`;
                                  },
                                },
                                {
                                  title: "Uploaded By",
                                  dataIndex: ["uploadedBy", "name"],
                                  key: "uploadedBy",
                                  width: 160,
                                  render: (name: string, record: any) => (
                                    <Space size={6}>
                                      <Avatar size="small" icon={<UserIcon size={12} />} />
                                      <Text style={{ fontSize: 12 }}>{name || "User"}</Text>
                                    </Space>
                                  ),
                                },
                                {
                                  title: "Upload Date",
                                  dataIndex: "createdAt",
                                  key: "createdAt",
                                  width: 170,
                                  render: (d: string) => dayjs(d).format("DD MMM YYYY h:mm A"),
                                },
                                {
                                  title: "Actions",
                                  key: "actions",
                                  width: 150,
                                  render: (_: any, record: any) => {
                                    const downloadUrl = `/api/projects/${id}/attachments/${record._id}`;
                                    return (
                                      <Space size={6}>
                                        <Button
                                          size="small"
                                          icon={<EyeOutlined />}
                                          onClick={() => {
                                            setPreviewUrl(`${downloadUrl}?inline=true`);
                                            setPreviewFilename(record.originalName);
                                            setPreviewOpen(true);
                                          }}
                                        />
                                        <Button
                                          size="small"
                                          icon={<Download size={12} />}
                                          onClick={() => window.open(downloadUrl, "_blank")}
                                        >
                                          Download
                                        </Button>
                                        <Popconfirm
                                          title="Delete File"
                                          description="Are you sure you want to delete this file?"
                                          onConfirm={() => handleDeleteAttachment(record._id)}
                                          okText="Yes"
                                          cancelText="No"
                                        >
                                          <Button size="small" danger icon={<Trash2 size={12} />} />
                                        </Popconfirm>
                                      </Space>
                                    );
                                  },
                                },
                              ]}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ),
            },
            ...(isProjectLead
              ? [
                  {
                    key: "activities",
                    label: "Project Activity Log",
                    children: (
                      <div style={{ padding: "12px 0" }}>
                        <Timeline
                          mode="start"
                          items={activities.map((act) => ({
                            label: dayjs(act.createdAt).format("DD MMM, YYYY h:mm A"),
                            color:
                              act.type === "sprint"
                                ? "blue"
                                : act.type === "work_log"
                                  ? "green"
                                  : act.type === "project_status"
                                    ? "purple"
                                    : "gray",
                            children: (
                              <div>
                                <Text strong style={{ fontSize: 12 }}>
                                  {act.description}
                                </Text>
                                <div style={{ fontSize: 10, color: "#999" }}>
                                  Action by {act.performedBy?.name} ({act.performedBy?.role}) |
                                  Category:{" "}
                                  <Tag style={{ fontSize: 9 }} color="default">
                                    {act.type}
                                  </Tag>
                                </div>
                              </div>
                            ),
                          }))}
                        />
                      </div>
                    ),
                  },
                ]
              : []),
            {
              key: "sprints",
              label: "Agile Sprints",
              children: (
                <div style={{ padding: "12px 0" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 20,
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <Title level={5} style={{ margin: 0 }}>
                        Interactive Sprint Management Board
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Drag and drop task cards to assign them between Active Sprint, Planned
                        Sprints, or Product Backlog.
                      </Text>
                    </div>
                    {isProjectLead && (
                      <Button
                        type="primary"
                        icon={<Plus size={14} />}
                        onClick={() => setIsSprintModalOpen(true)}
                        style={{ backgroundColor: "#00897b", border: "none" }}
                      >
                        New Sprint
                      </Button>
                    )}
                  </div>

                  {/* SPRINT LAYOUT */}
                  <Space direction="vertical" size={24} style={{ width: "100%" }}>
                    {/* 1. ACTIVE SPRINT SECTION */}
                    {(() => {
                      const activeSprint = sprints.find((s) => s.status === "Active");
                      if (!activeSprint) {
                        return (
                          <Card
                            size="small"
                            style={{
                              backgroundColor: "#fffbe6",
                              borderColor: "#ffe58f",
                              borderRadius: 10,
                            }}
                          >
                            <Row justify="space-between" align="middle">
                              <Col>
                                <Text strong style={{ color: "#d48806" }}>
                                  No Active Sprint currently running.
                                </Text>
                                <div style={{ fontSize: 12, color: "#8c6b00" }}>
                                  Start a planned sprint below or create a new sprint to begin
                                  iteration tracking.
                                </div>
                              </Col>
                            </Row>
                          </Card>
                        );
                      }

                      const activeTasks = workItems.filter(
                        (w) => w.sprint?._id === activeSprint._id
                      );
                      const completedTasks = activeTasks.filter((w) => w.status === "Done");
                      const openTasks = activeTasks.filter(
                        (w) => w.status !== "Done" && w.status !== "Cancelled"
                      );
                      const totalEstHours = activeTasks.reduce(
                        (sum, w) => sum + (w.estimatedHours || 0),
                        0
                      );
                      const totalActHours = activeTasks.reduce(
                        (sum, w) => sum + (w.actualHours || 0),
                        0
                      );
                      const daysLeft = dayjs(activeSprint.endDate).diff(dayjs(), "day");

                      return (
                        <Card
                          key={activeSprint._id}
                          style={{
                            borderRadius: 12,
                            borderColor:
                              dragOverSprintId === activeSprint._id ? "#00897b" : "#52c41a",
                            borderWidth: dragOverSprintId === activeSprint._id ? 2 : 1,
                            boxShadow: "0 4px 14px rgba(82,196,26,0.12)",
                            backgroundColor:
                              dragOverSprintId === activeSprint._id ? "#e6f7ff" : "#fafafa",
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverSprintId !== activeSprint._id)
                              setDragOverSprintId(activeSprint._id);
                          }}
                          onDragLeave={() => {
                            if (dragOverSprintId === activeSprint._id) setDragOverSprintId(null);
                          }}
                          onDrop={() =>
                            handleDropWorkItemToSprint(draggedWorkItemId, activeSprint._id)
                          }
                        >
                          {/* Active Sprint Header */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              flexWrap: "wrap",
                              gap: 12,
                              marginBottom: 16,
                            }}
                          >
                            <div>
                              <Space align="center">
                                <Tag
                                  color="success"
                                  style={{ fontWeight: 600, fontSize: 11, borderRadius: 4 }}
                                >
                                  CURRENT ACTIVE SPRINT
                                </Tag>
                                <Title level={4} style={{ margin: 0 }}>
                                  {activeSprint.name}
                                </Title>
                              </Space>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  Goal:{" "}
                                </Text>
                                <Text style={{ fontStyle: "italic", fontSize: 13 }}>
                                  {activeSprint.goal || "No specific goal provided."}
                                </Text>
                              </div>
                            </div>

                            <Space align="center" wrap>
                              <Tag
                                color={daysLeft < 0 ? "error" : daysLeft <= 2 ? "warning" : "blue"}
                                style={{ borderRadius: 6, fontSize: 12, padding: "4px 8px" }}
                              >
                                <CalendarIcon
                                  size={12}
                                  style={{
                                    display: "inline-block",
                                    verticalAlign: "middle",
                                    marginRight: 4,
                                  }}
                                />
                                {dayjs(activeSprint.startDate).format("DD MMM")} —{" "}
                                {dayjs(activeSprint.endDate).format("DD MMM YYYY")}
                                {daysLeft >= 0
                                  ? ` (${daysLeft} days left)`
                                  : ` (Overdue by ${Math.abs(daysLeft)} days)`}
                              </Tag>

                              {isProjectLead && (
                                <Button
                                  type="primary"
                                  onClick={() => handleOpenCompleteSprintModal(activeSprint)}
                                  style={{
                                    backgroundColor: "#1890ff",
                                    border: "none",
                                    fontWeight: 600,
                                  }}
                                >
                                  Complete Sprint ({openTasks.length} open)
                                </Button>
                              )}
                            </Space>
                          </div>

                          {/* Progress Bar & Metrics Banner */}
                          <Row
                            gutter={[16, 16]}
                            style={{
                              backgroundColor: "#fff",
                              padding: 12,
                              borderRadius: 8,
                              marginBottom: 16,
                              border: "1px solid #f0f0f0",
                            }}
                          >
                            <Col xs={24} md={10}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                SPRINT PROGRESS
                              </Text>
                              <Progress
                                percent={activeSprint.progressPercent || 0}
                                strokeColor="#52c41a"
                                status="active"
                              />
                            </Col>
                            <Col xs={12} md={7}>
                              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                WORK ITEMS
                              </Text>
                              <Text strong>{completedTasks.length} completed</Text> /{" "}
                              <Text type="secondary">{activeTasks.length} total tasks</Text>
                            </Col>
                            <Col xs={12} md={7}>
                              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                HOURS ESTIMATE
                              </Text>
                              <Text strong>{totalActHours} hrs logged</Text> /{" "}
                              <Text type="secondary">{totalEstHours} hrs estimated</Text>
                            </Col>
                          </Row>

                          {/* Active Sprint Draggable Task List */}
                          <div>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <Text strong style={{ fontSize: 13 }}>
                                Tasks in Active Sprint ({activeTasks.length})
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Drop items here to assign to Active Sprint
                              </Text>
                            </div>

                            {activeTasks.length === 0 ? (
                              <div
                                style={{
                                  padding: 24,
                                  textAlign: "center",
                                  border: "2px dashed #d9d9d9",
                                  borderRadius: 8,
                                  backgroundColor: "#fff",
                                }}
                              >
                                <Text type="secondary">
                                  No tasks assigned to Active Sprint. Drag work items from the
                                  Backlog below!
                                </Text>
                              </div>
                            ) : (
                              <Row gutter={[12, 12]}>
                                {activeTasks.map((item) => (
                                  <Col xs={24} sm={12} md={8} lg={6} key={item._id}>
                                    <div
                                      draggable
                                      onDragStart={() => setDraggedWorkItemId(item._id)}
                                      onClick={() => {
                                        setSelectedWorkItem(item);
                                        setWorkItemDetailOpen(true);
                                      }}
                                      style={{
                                        padding: 12,
                                        backgroundColor: "#fff",
                                        borderRadius: 8,
                                        border: "1px solid #e8e8e8",
                                        cursor: "grab",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                                        transition: "all 0.2s ease",
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
                                        <Tag
                                          color={
                                            item.type === "Bug"
                                              ? "red"
                                              : item.type === "Feature"
                                                ? "cyan"
                                                : "blue"
                                          }
                                          style={{ fontSize: 10, margin: 0 }}
                                        >
                                          {item.type}
                                        </Tag>
                                        <Tag
                                          color={
                                            item.priority === "Urgent"
                                              ? "red"
                                              : item.priority === "High"
                                                ? "orange"
                                                : "default"
                                          }
                                          style={{ fontSize: 10, margin: 0 }}
                                        >
                                          {item.priority}
                                        </Tag>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 600,
                                          color: "#1f2937",
                                          marginBottom: 6,
                                          lineClamp: 2,
                                          display: "-webkit-box",
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {item.title}
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginTop: 8,
                                          paddingTop: 6,
                                          borderTop: "1px solid #f5f5f5",
                                        }}
                                      >
                                        <Tag
                                          color={
                                            item.status === "Done"
                                              ? "green"
                                              : item.status === "Blocked"
                                                ? "volcano"
                                                : "processing"
                                          }
                                          style={{ fontSize: 10, margin: 0 }}
                                        >
                                          {item.status}
                                        </Tag>
                                        <Text type="secondary" style={{ fontSize: 11 }}>
                                          {item.assignee?.name || "Unassigned"}
                                        </Text>
                                      </div>
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            )}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* 2. PLANNED / FUTURE SPRINTS SECTION */}
                    <div>
                      <Title level={5} style={{ marginBottom: 12 }}>
                        Planned Sprints
                      </Title>
                      {(() => {
                        const plannedSprints = sprints.filter((s) => s.status === "Planned");
                        if (plannedSprints.length === 0) {
                          return (
                            <Card
                              size="small"
                              style={{
                                borderRadius: 8,
                                backgroundColor: "#fafafa",
                                textAlign: "center",
                                color: "#8c8c8c",
                              }}
                            >
                              No planned upcoming sprints. Create a new sprint to plan future
                              iterations.
                            </Card>
                          );
                        }

                        return (
                          <Space direction="vertical" size={16} style={{ width: "100%" }}>
                            {plannedSprints.map((sprint) => {
                              const sprintTasks = workItems.filter(
                                (w) => w.sprint?._id === sprint._id
                              );
                              const daysRange = `${dayjs(sprint.startDate).format("DD MMM")} — ${dayjs(sprint.endDate).format("DD MMM YYYY")}`;

                              return (
                                <Card
                                  key={sprint._id}
                                  size="small"
                                  style={{
                                    borderRadius: 10,
                                    borderColor:
                                      dragOverSprintId === sprint._id ? "#00897b" : "#d9d9d9",
                                    borderWidth: dragOverSprintId === sprint._id ? 2 : 1,
                                    backgroundColor:
                                      dragOverSprintId === sprint._id ? "#e6f7ff" : "#fff",
                                  }}
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    if (dragOverSprintId !== sprint._id)
                                      setDragOverSprintId(sprint._id);
                                  }}
                                  onDragLeave={() => {
                                    if (dragOverSprintId === sprint._id) setDragOverSprintId(null);
                                  }}
                                  onDrop={() =>
                                    handleDropWorkItemToSprint(draggedWorkItemId, sprint._id)
                                  }
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      flexWrap: "wrap",
                                      gap: 12,
                                      marginBottom: 12,
                                    }}
                                  >
                                    <Space align="center">
                                      <Tag color="blue" style={{ fontWeight: 600 }}>
                                        PLANNED
                                      </Tag>
                                      <Title level={5} style={{ margin: 0 }}>
                                        {sprint.name}
                                      </Title>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        ({daysRange})
                                      </Text>
                                    </Space>

                                    <Space>
                                      <Badge
                                        count={`${sprintTasks.length} tasks`}
                                        style={{ backgroundColor: "#108ee9" }}
                                      />
                                      {isProjectLead && (
                                        <Button
                                          size="small"
                                          type="primary"
                                          onClick={() =>
                                            handleUpdateSprintStatus(sprint._id, "Active")
                                          }
                                          style={{ backgroundColor: "#52c41a", border: "none" }}
                                        >
                                          Start Sprint
                                        </Button>
                                      )}
                                    </Space>
                                  </div>

                                  {sprint.goal && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "#666",
                                        marginBottom: 10,
                                        fontStyle: "italic",
                                      }}
                                    >
                                      Goal: {sprint.goal}
                                    </div>
                                  )}

                                  {/* Draggable Tasks in Planned Sprint */}
                                  <div
                                    style={{
                                      minHeight: 45,
                                      padding: 8,
                                      backgroundColor: "#fafafa",
                                      borderRadius: 6,
                                      border: "1px dashed #e8e8e8",
                                    }}
                                  >
                                    {sprintTasks.length === 0 ? (
                                      <Text type="secondary" style={{ fontSize: 11 }}>
                                        No tasks assigned. Drag work items here to assign to this
                                        sprint.
                                      </Text>
                                    ) : (
                                      <Row gutter={[8, 8]}>
                                        {sprintTasks.map((item) => (
                                          <Col xs={24} sm={12} md={8} lg={6} key={item._id}>
                                            <div
                                              draggable
                                              onDragStart={() => setDraggedWorkItemId(item._id)}
                                              onClick={() => {
                                                setSelectedWorkItem(item);
                                                setWorkItemDetailOpen(true);
                                              }}
                                              style={{
                                                padding: 8,
                                                backgroundColor: "#fff",
                                                borderRadius: 6,
                                                border: "1px solid #d9d9d9",
                                                cursor: "grab",
                                                fontSize: 12,
                                              }}
                                            >
                                              <div
                                                style={{
                                                  fontWeight: 600,
                                                  color: "#333",
                                                  whiteSpace: "nowrap",
                                                  overflow: "hidden",
                                                  textOverflow: "ellipsis",
                                                }}
                                              >
                                                {item.title}
                                              </div>
                                              <div
                                                style={{
                                                  display: "flex",
                                                  justifyContent: "space-between",
                                                  marginTop: 4,
                                                  fontSize: 10,
                                                  color: "#8c8c8c",
                                                }}
                                              >
                                                <span>{item.type}</span>
                                                <span>{item.assignee?.name || "Unassigned"}</span>
                                              </div>
                                            </div>
                                          </Col>
                                        ))}
                                      </Row>
                                    )}
                                  </div>
                                </Card>
                              );
                            })}
                          </Space>
                        );
                      })()}
                    </div>

                    {/* 3. PRODUCT BACKLOG (UNASSIGNED TASKS) */}
                    {(() => {
                      const backlogItems = workItems.filter((w) => !w.sprint || !w.sprint._id);
                      return (
                        <Card
                          size="small"
                          title={
                            <Space align="center">
                              <span>Product Backlog (Unassigned Tasks)</span>
                              <Badge
                                count={backlogItems.length}
                                style={{ backgroundColor: "#8c8c8c" }}
                              />
                            </Space>
                          }
                          style={{
                            borderRadius: 10,
                            borderColor: dragOverSprintId === "backlog" ? "#00897b" : "#d9d9d9",
                            borderWidth: dragOverSprintId === "backlog" ? 2 : 1,
                            backgroundColor: dragOverSprintId === "backlog" ? "#e6f7ff" : "#fff",
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverSprintId !== "backlog") setDragOverSprintId("backlog");
                          }}
                          onDragLeave={() => {
                            if (dragOverSprintId === "backlog") setDragOverSprintId(null);
                          }}
                          onDrop={() => handleDropWorkItemToSprint(draggedWorkItemId, null)}
                        >
                          <div style={{ minHeight: 60, padding: 8, borderRadius: 6 }}>
                            {backlogItems.length === 0 ? (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                All work items are currently assigned to sprints!
                              </Text>
                            ) : (
                              <Row gutter={[10, 10]}>
                                {backlogItems.map((item) => (
                                  <Col xs={24} sm={12} md={8} lg={6} key={item._id}>
                                    <div
                                      draggable
                                      onDragStart={() => setDraggedWorkItemId(item._id)}
                                      onClick={() => {
                                        setSelectedWorkItem(item);
                                        setWorkItemDetailOpen(true);
                                      }}
                                      style={{
                                        padding: 10,
                                        backgroundColor: "#fafafa",
                                        borderRadius: 6,
                                        border: "1px solid #e0e0e0",
                                        cursor: "grab",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: 4,
                                        }}
                                      >
                                        <Tag
                                          color={item.type === "Bug" ? "red" : "cyan"}
                                          style={{ fontSize: 10, margin: 0 }}
                                        >
                                          {item.type}
                                        </Tag>
                                        <Tag
                                          color={item.priority === "Urgent" ? "red" : "default"}
                                          style={{ fontSize: 10, margin: 0 }}
                                        >
                                          {item.priority}
                                        </Tag>
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: "#222",
                                          lineClamp: 2,
                                          display: "-webkit-box",
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: "vertical",
                                          overflow: "hidden",
                                        }}
                                      >
                                        {item.title}
                                      </div>
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          marginTop: 6,
                                          fontSize: 10,
                                          color: "#666",
                                        }}
                                      >
                                        <span>Status: {item.status}</span>
                                        <span>{item.assignee?.name || "Unassigned"}</span>
                                      </div>
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            )}
                          </div>
                        </Card>
                      );
                    })()}

                    {/* 4. COMPLETED SPRINTS ACCORDION / HISTORY */}
                    {(() => {
                      const completed = sprints.filter((s) => s.status === "Completed");
                      if (completed.length === 0) return null;

                      return (
                        <Card
                          size="small"
                          title={`Completed Sprints (${completed.length})`}
                          style={{ borderRadius: 10, backgroundColor: "#fafafa" }}
                        >
                          <List
                            size="small"
                            dataSource={completed}
                            renderItem={(sprint) => (
                              <List.Item key={sprint._id}>
                                <div
                                  style={{
                                    width: "100%",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div>
                                    <Text
                                      strong
                                      style={{ textDecoration: "line-through", color: "#8c8c8c" }}
                                    >
                                      {sprint.name}
                                    </Text>
                                    <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                                      {dayjs(sprint.startDate).format("DD MMM YYYY")} —{" "}
                                      {dayjs(sprint.endDate).format("DD MMM YYYY")}
                                    </div>
                                  </div>
                                  <Tag color="default">Completed</Tag>
                                </div>
                              </List.Item>
                            )}
                          />
                        </Card>
                      );
                    })()}
                  </Space>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Drawer: Work Item Detail Panel */}
      <Drawer
        title={
          selectedWorkItem
            ? `${selectedWorkItem.title} (${selectedWorkItem.type})`
            : "Work Item Detail"
        }
        placement="right"
        size="large"
        onClose={() => {
          setSelectedWorkItem(null);
          setWorkItemDetailOpen(false);
        }}
        open={workItemDetailOpen}
        extra={
          selectedWorkItem && isProjectLead ? (
            <Button
              size="small"
              icon={<Edit3 size={12} />}
              onClick={() => openEditWorkItem(selectedWorkItem)}
              style={{ color: "#00897b", borderColor: "#00897b", fontWeight: 500 }}
            >
              Edit Task
            </Button>
          ) : null
        }
      >
        {selectedWorkItem && (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <div>
              <Text type="secondary">Description:</Text>
              <Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>
                {selectedWorkItem.description || "No description provided."}
              </Paragraph>
            </div>

            <Divider style={{ margin: "4px 0" }} />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    STATUS
                  </Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.status}
                    onChange={(val) => handleUpdateWorkItem(selectedWorkItem._id, { status: val })}
                    options={[
                      "Backlog",
                      "To Do",
                      "In Progress",
                      "Blocked",
                      "In Review",
                      "Testing",
                      "Done",
                      "Cancelled",
                    ].map((s) => ({ label: s, value: s }))}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    PRIORITY
                  </Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.priority}
                    onChange={(val) =>
                      handleUpdateWorkItem(selectedWorkItem._id, { priority: val })
                    }
                    options={["Low", "Medium", "High", "Urgent"].map((p) => ({
                      label: p,
                      value: p,
                    }))}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    ASSIGNEE
                  </Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.assignee?._id}
                    onChange={(val) =>
                      handleUpdateWorkItem(selectedWorkItem._id, { assignee: val })
                    }
                    options={users.map((u) => ({ label: u.name, value: u._id }))}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    SPRINT
                  </Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.sprint?._id}
                    onChange={(val) => handleUpdateWorkItem(selectedWorkItem._id, { sprint: val })}
                    options={[
                      { label: "Backlog / No Sprint", value: "" },
                      ...sprints.map((s) => ({ label: s.name, value: s._id })),
                    ]}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    EST. HOURS
                  </Text>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.estimatedHours}
                    onChange={(e) =>
                      handleUpdateWorkItem(selectedWorkItem._id, {
                        estimatedHours: Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    PROGRESS (% SLIDER)
                  </Text>
                  <Progress percent={selectedWorkItem.progress} style={{ marginTop: 8 }} />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.progress}
                    onChange={(e) => {
                      let val = Number(e.target.value);
                      if (val < 0) val = 0;
                      if (val > 100) val = 100;
                      handleUpdateWorkItem(selectedWorkItem._id, {
                        progress: val,
                      });
                    }}
                  />
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: "4px 0" }} />

            {/* Work Logs Section */}
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Work Hours Logged ({selectedWorkItem.actualHours || 0} hrs total)
              </Text>
              <List
                size="small"
                dataSource={selectedWorkItem.workLogs || []}
                renderItem={(log: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Text strong style={{ fontSize: 12 }}>
                          {log.hoursSpent} hours by {log.loggedBy?.name || "User"}
                        </Text>
                      }
                      description={
                        <div>
                          <span style={{ fontSize: 11 }}>{log.description}</span>{" "}
                          <span style={{ fontSize: 10, color: "#999", float: "right" }}>
                            {dayjs(log.date).format("DD MMM")}
                          </span>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />

              <Card size="small" title="Log Hours" style={{ marginTop: 8, borderRadius: 6 }}>
                <Form form={workLogForm} layout="vertical" onFinish={handleAddWorkLog}>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="date"
                        label="Date"
                        rules={[{ required: true }]}
                        style={{ marginBottom: 8 }}
                      >
                        <DatePicker style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="hoursSpent"
                        label="Hours Spent"
                        rules={[{ required: true }]}
                        style={{ marginBottom: 8 }}
                      >
                        <Input type="number" step="0.5" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item
                    name="description"
                    label="Work description"
                    style={{ marginBottom: 8 }}
                  >
                    <Input placeholder="Describe what you did..." />
                  </Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="small"
                    style={{ backgroundColor: "#00897b", border: "none" }}
                  >
                    Log Work
                  </Button>
                </Form>
              </Card>
            </div>

            <Divider style={{ margin: "4px 0" }} />

            {/* Comments Section */}
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Comments
              </Text>
              <List
                size="small"
                dataSource={selectedWorkItem.comments || []}
                renderItem={(com: any) => (
                  <div
                    style={{
                      padding: "6px 8px",
                      backgroundColor: "#f9f9f9",
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <Text strong style={{ fontSize: 11 }}>
                        {com.author?.name || "Author"}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 9 }}>
                        {dayjs(com.createdAt).format("DD MMM h:mm A")}
                      </Text>
                    </div>
                    <p style={{ margin: "2px 0 0 0", fontSize: 11 }}>{com.text}</p>
                  </div>
                )}
              />

              <Form
                form={commentForm}
                layout="vertical"
                onFinish={handleAddComment}
                style={{ marginTop: 8 }}
              >
                <Form.Item name="text" style={{ marginBottom: 8 }}>
                  <TextArea rows={2} placeholder="Add a comment..." />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="small"
                  style={{ backgroundColor: "#00897b", border: "none" }}
                >
                  Add Comment
                </Button>
              </Form>
            </div>

            {/* Attachments Section - Display only if existing, without upload file option */}
            {selectedWorkItem.attachments && selectedWorkItem.attachments.length > 0 && (
              <>
                <Divider style={{ margin: "4px 0" }} />
                <div>
                  <Text strong style={{ display: "block", marginBottom: 8 }}>
                    Task Attachments
                  </Text>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedWorkItem.attachments.map((att: any, idx: number) => (
                      <Tag
                        key={idx}
                        color="blue"
                        style={{ cursor: "pointer" }}
                        onClick={() => window.open(att.url, "_blank")}
                      >
                        <Paperclip size={10} style={{ display: "inline-block", marginRight: 4 }} />{" "}
                        {att.name}
                      </Tag>
                    ))}
                  </div>
                </div>
              </>
            )}
          </Space>
        )}
      </Drawer>

      {/* MODAL 1: Edit Project Details */}
      <Modal
        title="Edit Project Specifications"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        width={560}
        style={{ top: 60 }}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateProject}>
          <Form.Item
            name="title"
            label="Requirement / Project Title"
            rules={[{ required: true, message: "Please input title" }]}
          >
            <Input placeholder="e.g. Android Customer Delivery App" />
          </Form.Item>

          <Form.Item name="description" label="Project Description">
            <TextArea rows={3} placeholder="Project overview, scope, and objectives..." />
          </Form.Item>

          <Form.Item
            name="timeline"
            label="Timeline Dates"
            rules={[{ required: true, message: "Please select timeline dates" }]}
          >
            <DatePicker.RangePicker style={{ width: "100%" }} />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="techOwner" label="Project Manager">
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Assign Project Manager"
                  options={users.map((u: any) => ({
                    label: u.name,
                    value: String(u._id || u.id),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="techTeamMembers" label="Assigned Members">
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Assign multiple team members"
                  options={users.map((u: any) => ({
                    label: u.name,
                    value: String(u._id || u.id),
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sprintId" label="Sprint">
                <Select
                  allowClear
                  placeholder="Select Sprint"
                  options={sprints.map((s: any) => ({
                    label: s.title || `Sprint ${s.sprintNumber}`,
                    value: s._id,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: "Please select priority" }]}
              >
                <Select
                  options={[
                    { label: "Low", value: "Low" },
                    { label: "Medium", value: "Medium" },
                    { label: "High", value: "High" },
                    { label: "Critical", value: "Critical" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="status"
                label="Project Status"
                rules={[{ required: true, message: "Please select status" }]}
              >
                <Select options={PROJECT_STAGES.map((s) => ({ label: s.label, value: s.key }))} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Button onClick={() => setIsEditModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#00897b", border: "none" }}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 2: Create Task */}
      <Modal
        title="Create Follow-up / Clarification Task"
        open={isTaskModalOpen}
        onCancel={() => setIsTaskModalOpen(false)}
        footer={null}
      >
        <Form form={taskForm} layout="vertical" onFinish={handleCreateTask}>
          <Form.Item
            name="title"
            label="Task Title"
            rules={[{ required: true, message: "Task title is required" }]}
          >
            <Input placeholder="e.g. Clarify payment gateway merchant accounts" />
          </Form.Item>

          <Form.Item name="description" label="Task Description">
            <TextArea rows={3} placeholder="Add specific details or questions to resolve." />
          </Form.Item>

          <Form.Item
            name="dueDate"
            label="Due Date & Time"
            rules={[{ required: true, message: "Select deadline" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="assignedTo"
            label="Assign to Employee"
            rules={[{ required: true, message: "Assignee is required" }]}
          >
            <Select
              placeholder="Select team member"
              options={users.map((u) => ({ label: `${u.name} (${u.role})`, value: u._id }))}
            />
          </Form.Item>

          <div
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#666",
            }}
          >
            <CalendarIcon size={14} color="#00897b" />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tasks will sync automatically if the assignee has connected their Google Calendar.
            </Text>
          </div>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsTaskModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#00897b", border: "none" }}
            >
              Create Task
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 3: Raise Blocker */}
      <Modal
        title="Raise Blocker / Dependency"
        open={isBlockerModalOpen}
        onCancel={() => setIsBlockerModalOpen(false)}
        footer={null}
      >
        <Form form={blockerForm} layout="vertical" onFinish={handleCreateBlocker}>
          <Form.Item
            name="title"
            label="Blocker Title"
            rules={[{ required: true, message: "Title is required" }]}
          >
            <Input placeholder="e.g. Missing staging API credentials" />
          </Form.Item>

          <Form.Item name="description" label="Detailed Description">
            <TextArea rows={3} placeholder="Describe what is blocked and how to resolve it." />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="type" label="Blocker Type" rules={[{ required: true }]}>
                <Select
                  placeholder="Select Type"
                  options={[
                    { label: "Client-side", value: "Client-side" },
                    { label: "Internal", value: "Internal" },
                    { label: "Third-party", value: "Third-party" },
                    { label: "Technical", value: "Technical" },
                    { label: "Commercial", value: "Commercial" },
                    { label: "Legal", value: "Legal" },
                    { label: "API", value: "API" },
                    { label: "Data", value: "Data" },
                    { label: "Hardware", value: "Hardware" },
                    { label: "Other", value: "Other" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="priority" label="Blocker Priority" rules={[{ required: true }]}>
                <Select
                  placeholder="Select Priority"
                  options={[
                    { label: "Low", value: "Low" },
                    { label: "Medium", value: "Medium" },
                    { label: "High", value: "High" },
                    { label: "Critical", value: "Critical" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="ownerId" label="Owner (To Resolve)" rules={[{ required: true }]}>
                <Select
                  placeholder="Select Owner"
                  options={users.map((u) => ({ label: `${u.name} (${u.role})`, value: u._id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dueDate" label="Target Resolution Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="workItemId" label="Linked Work Item">
                <Select
                  placeholder="Select Work Item"
                  allowClear
                  options={workItems.map((w) => ({ label: w.title, value: w._id }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sprintId" label="Linked Sprint">
                <Select
                  placeholder="Select Sprint"
                  allowClear
                  options={sprints.map((s) => ({ label: s.name, value: s._id }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="impact" label="Blocker Impact Level">
            <Select
              placeholder="Select Impact"
              options={["Low", "Medium", "High", "Blocker", "Critical"].map((i) => ({
                label: i,
                value: i,
              }))}
            />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsBlockerModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#ff4d4f", border: "none" }}
            >
              Raise Blocker
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 4: Resolve Blocker */}
      <Modal
        title="Resolve Blocker"
        open={isResolveModalOpen}
        onCancel={() => setIsResolveModalOpen(false)}
        footer={null}
      >
        <Form form={resolveForm} layout="vertical" onFinish={handleResolveBlocker}>
          <Paragraph>Specify how the blocker was resolved and provide any details.</Paragraph>
          <Form.Item
            name="resolutionNote"
            label="Resolution Notes"
            rules={[{ required: true, message: "Please enter resolution notes" }]}
          >
            <TextArea
              rows={4}
              placeholder="e.g. Client provided API keys on email, staging connection is now active."
            />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsResolveModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#52c41a", border: "none" }}
            >
              Submit Resolution
            </Button>
          </div>
        </Form>
      </Modal>

      {/* SPRINT MODAL */}
      <Modal
        title="Create Sprint"
        open={isSprintModalOpen}
        onCancel={() => setIsSprintModalOpen(false)}
        footer={null}
      >
        <Form form={sprintForm} layout="vertical" onFinish={handleCreateSprint}>
          <Form.Item
            name="name"
            label="Sprint Name"
            rules={[{ required: true, message: "Name is required" }]}
          >
            <Input placeholder="e.g. Sprint 1 - Core Auth & Setup" />
          </Form.Item>
          <Form.Item name="goal" label="Sprint Goal">
            <TextArea rows={2} placeholder="e.g. Deliver Google Login and dashboard UI elements" />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="endDate" label="End Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsSprintModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#00897b", border: "none" }}
            >
              Create Sprint
            </Button>
          </div>
        </Form>
      </Modal>

      {/* COMPLETE SPRINT MODAL */}
      <Modal
        title={sprintToComplete ? `Complete Sprint: ${sprintToComplete.name}` : "Complete Sprint"}
        open={isCompleteSprintModalOpen}
        onCancel={() => setIsCompleteSprintModalOpen(false)}
        onOk={handleConfirmCompleteSprint}
        okText="Move Tasks & Complete Sprint"
        okButtonProps={{ style: { backgroundColor: "#00897b", border: "none" } }}
      >
        {sprintToComplete &&
          (() => {
            const sprintTasks = workItems.filter((w) => w.sprint?._id === sprintToComplete._id);
            const completedCount = sprintTasks.filter((w) => w.status === "Done").length;
            const openTasks = sprintTasks.filter(
              (w) => w.status !== "Done" && w.status !== "Cancelled"
            );
            const plannedSprints = sprints.filter(
              (s) => s.status === "Planned" && s._id !== sprintToComplete._id
            );

            return (
              <div style={{ padding: "8px 0" }}>
                <Paragraph>
                  This sprint includes <Text strong>{completedCount}</Text> completed tasks and{" "}
                  <Text type="danger" strong>
                    {openTasks.length}
                  </Text>{" "}
                  incomplete tasks.
                </Paragraph>

                {openTasks.length > 0 ? (
                  <div style={{ marginTop: 16 }}>
                    <Text strong style={{ display: "block", marginBottom: 8 }}>
                      Select destination for the {openTasks.length} incomplete tasks:
                    </Text>
                    <Select
                      style={{ width: "100%" }}
                      value={targetSprintForMigration}
                      onChange={setTargetSprintForMigration}
                      options={[
                        ...plannedSprints.map((ps) => ({
                          label: `Move to Planned Sprint: ${ps.name}`,
                          value: ps._id,
                        })),
                        { label: "Move to Product Backlog (Unassigned)", value: "backlog" },
                      ]}
                    />
                  </div>
                ) : (
                  <Paragraph type="success">
                    All tasks in this sprint are completed! No tasks need migration.
                  </Paragraph>
                )}
              </div>
            );
          })()}
      </Modal>

      {/* DRIVE NEW FOLDER MODAL */}
      <Modal
        title="Create New Folder in Drive"
        open={isFolderModalOpen}
        onCancel={() => {
          setIsFolderModalOpen(false);
          folderForm.resetFields();
        }}
        footer={null}
        width={420}
      >
        <Form form={folderForm} layout="vertical" onFinish={handleCreateFolder}>
          <div style={{ marginBottom: 12, color: "#64748b", fontSize: 13 }}>
            Target Location:{" "}
            <strong style={{ color: "#00897b" }}>
              {currentFolder === "/" ? "Root (/)" : currentFolder}
            </strong>
          </div>
          <Form.Item
            name="folderName"
            label="Folder Name"
            rules={[
              { required: true, message: "Please enter folder name" },
              {
                pattern: /^[^\\/:*?"<>|]+$/,
                message: "Folder name cannot contain special characters / \\ : * ? < > |",
              },
            ]}
          >
            <Input
              placeholder="e.g. Specifications"
              prefix={<Folder size={16} color="#f59e0b" style={{ marginRight: 4 }} />}
            />
          </Form.Item>
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Button
              onClick={() => {
                setIsFolderModalOpen(false);
                folderForm.resetFields();
              }}
              style={{ marginRight: 8 }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#00897b", border: "none" }}
            >
              Create Folder
            </Button>
          </div>
        </Form>
      </Modal>

      {/* CREATE SELF TASK MODAL (AVAILABLE FOR EVERY TEAM MEMBER) */}
      <Modal
        title={
          <Space size={8}>
            <CheckSquare size={18} color="#00897b" />
            <span style={{ fontWeight: 600 }}>Create Task for Myself</span>
          </Space>
        }
        open={isSelfTaskModalOpen}
        onCancel={() => {
          if (!submittingSelfTask) setIsSelfTaskModalOpen(false);
        }}
        footer={null}
        width={580}
        destroyOnHidden
        closable={!submittingSelfTask}
        mask={{ closable: !submittingSelfTask }}
      >
        <Spin spinning={submittingSelfTask} tip="Creating your task...">
          <Form
            form={selfTaskForm}
            layout="vertical"
            onFinish={handleCreateSelfTask}
            initialValues={{ priority: "Medium", status: "To Do", type: "Task" }}
            style={{ marginTop: 16 }}
          >
            <Form.Item
              name="title"
              label="* Task Title"
              rules={[{ required: true, message: "Please enter a task title" }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                size="large"
                placeholder="e.g. Implement API route, write test cases, review wireframes..."
                disabled={submittingSelfTask}
              />
            </Form.Item>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="type" label="Task Type" rules={[{ required: true }]}>
                  <Select
                    size="middle"
                    options={["Task", "Feature", "Bug", "Chore"].map((t) => ({
                      label: t,
                      value: t,
                    }))}
                    disabled={submittingSelfTask}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                  <Select
                    size="middle"
                    options={["Low", "Medium", "High", "Urgent"].map((p) => ({
                      label: p,
                      value: p,
                    }))}
                    disabled={submittingSelfTask}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="status" label="Initial Status" rules={[{ required: true }]}>
              <Select
                size="middle"
                options={["Backlog", "To Do", "In Progress"].map((s) => ({ label: s, value: s }))}
                disabled={submittingSelfTask}
              />
            </Form.Item>

            <Form.Item name="description" label="Notes / Description" style={{ marginBottom: 20 }}>
              <TextArea
                rows={3}
                placeholder="Add any details, instructions, acceptance criteria, or links..."
                disabled={submittingSelfTask}
              />
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button onClick={() => setIsSelfTaskModalOpen(false)} disabled={submittingSelfTask}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submittingSelfTask}
                style={{ backgroundColor: "#00897b", borderColor: "#00897b", fontWeight: 600 }}
              >
                {submittingSelfTask ? "Creating Task..." : "Create My Task"}
              </Button>
            </div>
          </Form>
        </Spin>
      </Modal>

      {/* WORK ITEM MODAL */}
      <Modal
        title={
          <Space size={8}>
            <CheckSquare size={18} color="#00897b" />
            <span>Create & Assign Work Item</span>
          </Space>
        }
        open={isWorkItemModalOpen}
        onCancel={() => {
          if (!submittingWorkItem) setIsWorkItemModalOpen(false);
        }}
        footer={null}
        width={620}
        closable={!submittingWorkItem}
        mask={{ closable: !submittingWorkItem }}
      >
        <Spin
          spinning={submittingWorkItem}
          tip="Processing task and dispatching email notifications..."
        >
          <Form
            form={workItemForm}
            layout="vertical"
            onFinish={handleCreateWorkItem}
            initialValues={{ type: "Task", priority: "High" }}
          >
            <Form.Item
              name="title"
              label="* Work Item Title"
              rules={[{ required: true, message: "Title is required" }]}
              style={{ marginBottom: 16 }}
            >
              <Input
                size="large"
                placeholder="e.g. Implement visitor check-in form"
                disabled={submittingWorkItem}
              />
            </Form.Item>

            <Form.Item name="description" label="Detailed Description" style={{ marginBottom: 16 }}>
              <TextArea
                rows={3}
                placeholder="Provide task requirements, acceptance criteria, or technical details..."
                disabled={submittingWorkItem}
              />
            </Form.Item>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="type" label="* Type" rules={[{ required: true }]}>
                  <Select
                    size="large"
                    options={["Task", "Feature", "Bug", "Chore"].map((t) => ({
                      label: t,
                      value: t,
                    }))}
                    disabled={submittingWorkItem}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="priority" label="* Priority" rules={[{ required: true }]}>
                  <Select
                    size="large"
                    options={["High", "Medium", "Low", "Urgent"].map((p) => ({
                      label: p,
                      value: p,
                    }))}
                    disabled={submittingWorkItem}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name="assignee" label="Assign To">
                  <Select
                    size="large"
                    placeholder="Select Employee"
                    allowClear
                    disabled={submittingWorkItem}
                    options={projectTeamMembers.map((u: any) => {
                      const isLead = String(u._id) === String(techOwnerId);
                      return {
                        label: `${u.name} (${isLead ? "Project Manager" : u.role || "Team Member"})`,
                        value: u._id,
                      };
                    })}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="dueDate" label="Target Due Date" style={{ marginBottom: 24 }}>
                  <DatePicker
                    size="large"
                    style={{ width: "100%" }}
                    placeholder="Select date"
                    disabled={submittingWorkItem}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="sprintId" label="Sprint" style={{ marginBottom: 24 }}>
              <Select
                size="large"
                placeholder="Select Sprint (Optional)"
                allowClear
                disabled={submittingWorkItem}
                options={sprints.map((s: any) => ({
                  label: s.title || `Sprint ${s.sprintNumber}`,
                  value: s._id,
                }))}
              />
            </Form.Item>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <Button
                size="large"
                onClick={() => setIsWorkItemModalOpen(false)}
                disabled={submittingWorkItem}
              >
                Cancel
              </Button>
              <Button
                size="large"
                type="primary"
                htmlType="submit"
                loading={submittingWorkItem}
                style={{ backgroundColor: "#00897b", borderColor: "#00897b", padding: "0 24px" }}
              >
                {submittingWorkItem ? "Creating & Assigning..." : "Create & Assign Task"}
              </Button>
            </div>
          </Form>
        </Spin>
      </Modal>

      {/* EDIT WORK ITEM / TASK MODAL */}
      <Modal
        title={
          <Space size={8}>
            <Edit3 size={18} color="#00897b" />
            <span>Edit Task / Work Item</span>
          </Space>
        }
        open={isEditWorkItemModalOpen}
        onCancel={() => {
          setIsEditWorkItemModalOpen(false);
          setEditingWorkItem(null);
        }}
        footer={null}
        width={650}
      >
        <Form form={editWorkItemForm} layout="vertical" onFinish={handleSaveEditWorkItem}>
          <Form.Item
            name="title"
            label="* Task / Work Item Title"
            rules={[{ required: true, message: "Title is required" }]}
            style={{ marginBottom: 14 }}
          >
            <Input size="large" placeholder="e.g. Implement visitor check-in form" />
          </Form.Item>

          <Form.Item name="description" label="Detailed Description" style={{ marginBottom: 14 }}>
            <TextArea
              rows={3}
              placeholder="Task requirements, acceptance criteria, or technical details..."
            />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="type"
                label="* Type"
                rules={[{ required: true }]}
                style={{ marginBottom: 14 }}
              >
                <Select
                  size="middle"
                  options={["Task", "Feature", "Bug", "Chore"].map((t) => ({ label: t, value: t }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="priority"
                label="* Priority"
                rules={[{ required: true }]}
                style={{ marginBottom: 14 }}
              >
                <Select
                  size="middle"
                  options={["High", "Medium", "Low", "Urgent"].map((p) => ({ label: p, value: p }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="status"
                label="* Status"
                rules={[{ required: true }]}
                style={{ marginBottom: 14 }}
              >
                <Select
                  size="middle"
                  options={[
                    "Backlog",
                    "To Do",
                    "In Progress",
                    "Blocked",
                    "In Review",
                    "Testing",
                    "Done",
                    "Cancelled",
                  ].map((s) => ({ label: s, value: s }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {isProjectLead && (
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={24}>
                <Form.Item name="assignee" label="Assign To" style={{ marginBottom: 14 }}>
                  <Select
                    size="middle"
                    placeholder="Select Employee"
                    allowClear
                    options={projectTeamMembers.map((u: any) => {
                      const isLead = String(u._id) === String(techOwnerId);
                      return {
                        label: `${u.name} (${isLead ? "Project Manager" : u.role || "Team Member"})`,
                        value: u._id,
                      };
                    })}
                  />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item name="dueDate" label="Target Due Date" style={{ marginBottom: 14 }}>
                <DatePicker size="middle" style={{ width: "100%" }} placeholder="Select date" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="estimatedHours" label="Est. Hours" style={{ marginBottom: 14 }}>
                <Input type="number" step="0.5" min={0} placeholder="e.g. 8" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="progress" label="Progress (%)" style={{ marginBottom: 14 }}>
                <Input type="number" min={0} max={100} placeholder="0 - 100" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <Button
              onClick={() => {
                setIsEditWorkItemModalOpen(false);
                setEditingWorkItem(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submittingEditWorkItem}
              style={{ backgroundColor: "#00897b", borderColor: "#00897b", padding: "0 20px" }}
            >
              Save Changes
            </Button>
          </div>
        </Form>
      </Modal>

      {/* TEST CASE MODAL */}
      <Modal
        title="Create Test Case"
        open={isTestCaseModalOpen}
        onCancel={() => setIsTestCaseModalOpen(false)}
        footer={null}
      >
        <Form form={testCaseForm} layout="vertical" onFinish={handleCreateTestCase}>
          <Form.Item name="title" label="Test Case Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Verify visitor phone SMS OTP verification" />
          </Form.Item>
          <Form.Item name="steps" label="Test Steps">
            <TextArea
              rows={3}
              placeholder="1. Go to visitor login\n2. Enter valid phone number\n3. Click send OTP"
            />
          </Form.Item>
          <Form.Item name="expectedResult" label="Expected Result">
            <TextArea
              rows={2}
              placeholder="OTP code is generated and successfully sent to target device."
            />
          </Form.Item>
          <Form.Item name="workItemId" label="Linked Work Item">
            <Select
              placeholder="Link to work item"
              allowClear
              options={workItems.map((w) => ({ label: w.title, value: w._id }))}
            />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsTestCaseModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#00897b", border: "none" }}
            >
              Create Test Case
            </Button>
          </div>
        </Form>
      </Modal>

      {/* RUN TEST MODAL */}
      <Modal
        title={selectedTestCase ? `Run Test: ${selectedTestCase.title}` : "Run Test"}
        open={isRunTestModalOpen}
        onCancel={() => setIsRunTestModalOpen(false)}
        footer={null}
      >
        <Form form={runTestForm} layout="vertical" onFinish={handleRunTestCase}>
          <Form.Item name="status" label="Testing Verdict" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Passed", value: "Passed" },
                { label: "Failed", value: "Failed" },
                { label: "Retest", value: "Retest" },
                { label: "Blocked", value: "Blocked" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="actualResult"
            label="Actual Verdict Details / Observations"
            rules={[{ required: true }]}
          >
            <TextArea rows={3} placeholder="Record what actually happened during the test run..." />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="evidenceName" label="Evidence Name">
                <Input placeholder="e.g. test_screenshot.png" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="evidenceUrl" label="Evidence URL">
                <Input placeholder="e.g. https://storage.google.com/..." />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsRunTestModalOpen(false)} style={{ marginRight: 8 }}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              style={{ backgroundColor: "#00897b", border: "none" }}
            >
              Submit Run Verdict
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Manage Team & Project Manager Modal */}
      <Modal
        title={
          <Space>
            <UsersIcon size={18} color="#00897b" />
            <span>Manage Project Manager & Team Members</span>
            <Tag color="purple">Admin Only</Tag>
          </Space>
        }
        open={isTeamModalOpen}
        onCancel={() => setIsTeamModalOpen(false)}
        onOk={() => teamForm.submit()}
        okText="Save Team"
        okButtonProps={{ style: { background: "#00897b", borderColor: "#00897b" } }}
        destroyOnHidden
      >
        <Form form={teamForm} layout="vertical" onFinish={handleSaveTeam}>
          <Form.Item
            name="techOwner"
            label="Project Manager"
            extra="Designate the primary Project Manager responsible for technical direction and delivery."
          >
            <Select
              placeholder="Select Project Manager"
              allowClear
              showSearch
              optionFilterProp="label"
              options={users.map((u) => ({
                label: `${u.name} (${u.designation || u.role})`,
                value: u._id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="techTeamMembers"
            label="Assigned Project Members"
            extra="Select all employee members who will work on this project."
          >
            <Select
              mode="multiple"
              placeholder="Select Project Members"
              allowClear
              showSearch
              optionFilterProp="label"
              options={users.map((u) => ({
                label: `${u.name} (${u.designation || u.role})`,
                value: u._id,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Project Personal Task Modal */}
      <Modal
        title="Add Personal Task"
        open={isPersonalTaskModalOpen}
        onCancel={() => setIsPersonalTaskModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <Form
          form={personalTaskForm}
          layout="vertical"
          onFinish={handleCreatePersonalTask}
          initialValues={{ priority: "Medium", status: "Todo", date: dayjs() }}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="title"
            label="Task Title"
            rules={[{ required: true, message: "Please enter a task title" }]}
          >
            <Input placeholder="e.g. Finish component testing, write notes..." />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="date" label="Due Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="Low">Low</Select.Option>
                  <Select.Option value="Medium">Medium</Select.Option>
                  <Select.Option value="High">High</Select.Option>
                  <Select.Option value="Urgent">Urgent</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="Todo">Todo</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="Done">Done</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Notes / Description">
            <Input.TextArea rows={3} placeholder="Add personal notes, links or details..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: "right" }}>
            <Space>
              <Button onClick={() => setIsPersonalTaskModalOpen(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: "#00897b", border: "none" }}
              >
                Add Task
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Report Preview Modal */}
      <ReportPreviewModal
        open={previewOpen}
        url={previewUrl}
        filename={previewFilename}
        onClose={() => {
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
          setPreviewOpen(false);
        }}
      />
    </div>
  );
}

interface ReportPreviewModalProps {
  open: boolean;
  url: string | null;
  filename: string;
  onClose: () => void;
}

function ReportPreviewModal({ open, url, filename, onClose }: ReportPreviewModalProps) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <Space>
          <FileText size={18} color="#00897b" />
          <span style={{ fontWeight: 600 }}>File Preview</span>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 400 }}>
            — {filename}
          </Text>
        </Space>
      }
      width={1000}
      styles={{ body: { padding: 0, height: "75vh", overflow: "hidden" } }}
      footer={[
        <Button key="close" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="download"
          type="primary"
          icon={<Download size={14} />}
          style={{ background: "#00897b", borderColor: "#00897b" }}
          onClick={() => {
            const link = document.createElement("a");
            link.href = url!;
            link.download = filename;
            link.click();
            onClose();
          }}
        >
          Download
        </Button>,
      ]}
    >
      {url ? (
        <iframe
          src={`${url}#toolbar=0`}
          style={{ width: "100%", height: "100%", border: "none" }}
          title="PDF Preview"
        />
      ) : (
        <div style={{ padding: 40, textAlign: "center" }}>
          <Skeleton active />
        </div>
      )}
    </Modal>
  );
}

// ----------------------------------------------------
// Main Exports (Handles Promise params unwrapping)
// ----------------------------------------------------
export default function ProjectDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  return <ProjectDetailsClient id={id} />;
}
