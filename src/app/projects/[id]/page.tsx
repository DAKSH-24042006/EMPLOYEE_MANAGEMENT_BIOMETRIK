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
  KanbanSquare,
  ListFilter,
  CheckSquare,
  FileText,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { FilePdfOutlined } from "@ant-design/icons";
import { generateProjectPDF } from "@/lib/reportUtils";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ----------------------------------------------------
// Unified Project Stages Single Source of Truth
// ----------------------------------------------------
const PROJECT_STAGES = [
  { key: "Requirement Created", label: "Requirement Created", shortLabel: "Req. Created" },
  { key: "Submitted for Tech Review", label: "Submitted for Tech Review", shortLabel: "Tech Review" },
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
  const [project, setProject] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [selectedBlocker, setSelectedBlocker] = useState<any>(null);

  // New Lifecycle Modals & Drawers
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [isWorkItemModalOpen, setIsWorkItemModalOpen] = useState(false);
  const [isTestCaseModalOpen, setIsTestCaseModalOpen] = useState(false);
  const [isRunTestModalOpen, setIsRunTestModalOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<any>(null);
  const [workItemDetailOpen, setWorkItemDetailOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<any>(null);

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
  const [workViewMode, setWorkViewMode] = useState<"table" | "kanban">("table");

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

  // Chat message & mentions state
  const [chatInput, setChatInput] = useState("");
  const [chatMentions, setChatMentions] = useState<string[]>([]);
  const [chatUploading, setChatUploading] = useState(false);
  const [chatFile, setChatFile] = useState<any>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    refreshData();
  }, [id]);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

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
  };

  // Fetch functions
  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/user/me");
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
      const res = await fetch(`/api/projects/${id}`);
      const json = await res.json();
      if (res.ok) {
        setProject(json.data);
        editForm.setFieldsValue({
          title: json.data.title,
          companyName: json.data.clientDetails.companyName,
          contactPerson: json.data.clientDetails.contactPerson,
          email: json.data.clientDetails.email,
          visitorManagement: !!json.data.features.visitorManagement,
          attendanceManagement: !!json.data.features.attendanceManagement,
          digilockerAuthentication: !!json.data.features.digilockerAuthentication,
          webApp: !!json.data.features.webApp,
          androidApp: !!json.data.features.androidApp,
          iosApp: !!json.data.features.iosApp,
          videoKYC: !!json.data.features.videoKYC,
          rbac: !!json.data.features.rbac,
          adminPanel: !!json.data.features.adminPanel,
          online: !!json.data.features.online,
          offline: !!json.data.features.offline,
          cloud: !!json.data.features.cloud,
          onPremise: !!json.data.features.onPremise,
          extraAddOns: json.data.extraAddOns,
          useCase: json.data.useCase,
          targetUsers: json.data.targetUsers,
          functionalRequirements: json.data.functionalRequirements,
          nonFunctionalRequirements: json.data.nonFunctionalRequirements,
          budget: json.data.budget,
          integrations: json.data.integrations,
          priority: json.data.priority,
          status: json.data.status,
          timeline: [dayjs(json.data.timeline.startDate), dayjs(json.data.timeline.endDate)],
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
      const res = await fetch(`/api/projects/${id}/tasks`);
      const json = await res.json();
      if (res.ok) setTasks(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchChat = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/chat`);
      const json = await res.json();
      if (res.ok) setChatMessages(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlockers = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/blockers`);
      const json = await res.json();
      if (res.ok) setBlockers(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/attachments`);
      const json = await res.json();
      if (res.ok) setAttachments(json.data);
    } catch (err) {
      console.error(err);
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
      const res = await fetch(`/api/projects/${id}/sprints`);
      const json = await res.json();
      if (res.ok) setSprints(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkItems = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/work-items`);
      const json = await res.json();
      if (res.ok) setWorkItems(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTestCases = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/test-cases`);
      const json = await res.json();
      if (res.ok) setTestCases(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/activities`);
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
      const payload = {
        title: values.title,
        clientDetails: {
          companyName: values.companyName,
          contactPerson: values.contactPerson,
          email: values.email,
        },
        features: {
          visitorManagement: !!values.visitorManagement,
          attendanceManagement: !!values.attendanceManagement,
          digilockerAuthentication: !!values.digilockerAuthentication,
          webApp: !!values.webApp,
          androidApp: !!values.androidApp,
          iosApp: !!values.iosApp,
          videoKYC: !!values.videoKYC,
          rbac: !!values.rbac,
          adminPanel: !!values.adminPanel,
          online: !!values.online,
          offline: !!values.offline,
          cloud: !!values.cloud,
          onPremise: !!values.onPremise,
        },
        extraAddOns: values.extraAddOns,
        useCase: values.useCase,
        targetUsers: values.targetUsers,
        functionalRequirements: values.functionalRequirements,
        nonFunctionalRequirements: values.nonFunctionalRequirements,
        budget: values.budget,
        integrations: values.integrations,
        priority: values.priority,
        status: values.status,
        timeline: values.timeline ? [values.timeline[0].toISOString(), values.timeline[1].toISOString()] : undefined,
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

  const handleCreateTask = async (values: any) => {
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
      const payload = {
        message: chatInput,
        mentions: chatMentions,
        attachment: chatFile ? { name: chatFile.name, url: chatFile.url } : undefined,
      };

      const res = await fetch(`/api/projects/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setChatInput("");
        setChatMentions([]);
        setChatFile(null);
        fetchChat();
      } else {
        message.error("Failed to send message");
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

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        setChatFile({ name: file.name, url: json.url });
        message.success(`${file.name} uploaded successfully.`);
        onSuccess(null, file);
      } else {
        message.error("Upload failed.");
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

  const handleDropWorkItemToSprint = async (itemId: string | null, targetSprintId: string | null) => {
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
        message.success(`Sprint "${sprintToComplete.name}" completed successfully! Incomplete tasks transferred.`);
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
    try {
      const res = await fetch(`/api/projects/${id}/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (res.ok) {
        message.success("Work item created!");
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
          newEvidence: values.evidenceName && values.evidenceUrl ? {
            name: values.evidenceName,
            url: values.evidenceUrl,
          } : undefined,
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
      case "Critical": return "red";
      case "High": return "orange";
      case "Medium": return "blue";
      default: return "default";
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Closed": return "default";
      case "Delivered": return "success";
      case "Signoff Pending": return "magenta";
      case "Testing/UAT": return "warning";
      case "Technically Approved": return "purple";
      case "Requirement Created": return "blue";
      default: return "processing";
    }
  };

  if (loading || !project) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0" }}>
        <Skeleton active />
        <Text type="secondary">Loading project lifecycle details...</Text>
      </div>
    );
  }

  const openBlockersList = blockers.filter((b) => b.status === "Open" || b.status === "In Progress");

  // --- Strict Closure Checklist Verification ---
  const closureVerification = {
    workItemsDone: workItems.filter((w) => w.status !== "Done" && w.status !== "Cancelled").length === 0,
    criticalBlockersResolved: blockers.filter((b) => (b.status === "Open" || b.status === "In Progress") && (b.priority === "High" || b.priority === "Critical")).length === 0,
    testCasesPassed: testCases.length > 0 && testCases.filter((t) => t.status !== "Passed").length === 0,
    uatPassed: project.uatStatus === "Passed" || project.uatStatus === "Client Accepted",
    internalApproved: !!project.internalApproval?.approved,
    salesApproved: !!project.salesApproval?.approved,
    clientSignoff: project.clientSignoffStatus === "Approved" || project.clientSignoffStatus === "Waived",
  };

  const isClosureGatePassed = Object.values(closureVerification).every(v => v === true);

  // Filtered work items
  const filteredWorkItems = workItems.filter((item) => {
    if (workFilterStatus !== "All" && item.status !== workFilterStatus) return false;
    if (workFilterAssignee !== "All" && item.assignee?._id !== workFilterAssignee) return false;
    if (workFilterSprint !== "All" && item.sprint?._id !== workFilterSprint) return false;
    if (workFilterPriority !== "All" && item.priority !== workFilterPriority) return false;
    if (workFilterOverdue) {
      const now = new Date();
      if (!item.dueDate || new Date(item.dueDate) >= now || item.status === "Done" || item.status === "Cancelled") return false;
    }
    return true;
  });

  return (
    <div style={{ width: "100%", maxWidth: 1300, margin: "0 auto", paddingBottom: 50, minWidth: 0 }}>
      {/* Header Bar */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
        <Space direction="vertical" size={4}>
          <Link href="/projects" style={{ display: "flex", alignItems: "center", gap: 8, color: "#676879", fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to Projects
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <Title level={3} style={{ margin: 0 }}>
              {project.title || "Unnamed Project"}
            </Title>
            <Tag color={getPriorityColor(project.priority)}>{project.priority} Priority</Tag>
            <Tag color={getStatusColor(project.status)}>{project.status}</Tag>
            {openBlockersList.length > 0 && (
              <Badge count={openBlockersList.length} style={{ backgroundColor: "#ff4d4f" }}>
                <Tag color="error" style={{ margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertOctagon size={12} /> Blocked
                </Tag>
              </Badge>
            )}
          </div>
          <Text type="secondary">
            Company: {project.clientDetails.companyName} | 
            Sales Owner: {project.createdBy?.name || "N/A"} | 
            Tech Owner: {project.techOwner?.name || "Unassigned"}
          </Text>
        </Space>

        <Space>
          <Button
            icon={<FilePdfOutlined />}
            loading={generatingPDF}
            onClick={handleGeneratePDF}
            style={{ color: "#00897b", borderColor: "#00897b" }}
          >
            Generate PDF
          </Button>
          {(currentUser?.role === "ADMIN" || currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM") && (
            <Button type="primary" onClick={() => setIsEditModalOpen(true)} style={{ backgroundColor: "#00897b", border: "none" }}>
              Edit Specifications
            </Button>
          )}
        </Space>
      </div>

      {/* Main Tabs */}
      <Card variant="borderless" style={{ borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", minWidth: 0, maxWidth: "100%" }}>
        <Tabs defaultActiveKey="1" items={[
          {
            key: "1",
            label: "Requirements Overview",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Row gutter={[24, 24]}>
                  <Col xs={24} lg={16}>
                    <Space direction="vertical" size={24} style={{ width: "100%" }}>
                      <div>
                        <Title level={5}>Use Case & Objective</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.useCase || "No use case details provided yet."}
                        </Paragraph>
                      </div>
                      <Divider style={{ margin: "4px 0" }} />
                      <div>
                        <Title level={5}>Target Users</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.targetUsers || "No target users provided yet."}
                        </Paragraph>
                      </div>
                      <Divider style={{ margin: "4px 0" }} />
                      <div>
                        <Title level={5}>Functional Requirements</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.functionalRequirements || "No functional requirements listed."}
                        </Paragraph>
                      </div>
                      <Divider style={{ margin: "4px 0" }} />
                      <div>
                        <Title level={5}>Non-Functional Requirements</Title>
                        <Paragraph style={{ whiteSpace: "pre-line" }}>
                          {project.nonFunctionalRequirements || "No non-functional requirements listed."}
                        </Paragraph>
                      </div>
                    </Space>
                  </Col>
                  <Col xs={24} lg={8}>
                    <Card size="small" title="Project Details & Metrics" style={{ borderRadius: 8, backgroundColor: "#fafafa" }}>
                      <div style={{ marginBottom: 16 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Requirement Completeness Score</Text>
                        <div style={{ marginTop: 4 }}>
                          {/* Completeness Calculator */}
                          {(() => {
                            let filled = 0;
                            const fields = [
                              project.title, project.useCase, project.targetUsers, 
                              project.functionalRequirements, project.nonFunctionalRequirements, 
                              project.budget, project.clientDetails?.contactPerson
                            ];
                            fields.forEach((f) => { if (f && f.trim() !== "") filled++; });
                            const hasFeatures = Object.values(project.features || {}).some((v) => v === true);
                            if (hasFeatures) filled++;
                            const score = Math.round((filled / 8) * 100);
                            return <Progress percent={score} strokeColor="#00897b" size="small" />;
                          })()}
                        </div>
                      </div>
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <div>
                          <Text type="secondary" style={{ display: "block", fontSize: 11 }}>EST. BUDGET</Text>
                          <Text strong>{project.budget || "Not defined"}</Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ display: "block", fontSize: 11 }}>INTEGRATIONS</Text>
                          <Text>{project.integrations || "None specified"}</Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ display: "block", fontSize: 11 }}>ADD-ONS & NOTES</Text>
                          <Text style={{ fontSize: 13 }}>{project.extraAddOns || "No add-on notes"}</Text>
                        </div>
                        <Divider style={{ margin: "8px 0" }} />
                        <div>
                          <Text type="secondary" style={{ display: "block", fontSize: 11, marginBottom: 4 }}>FEATURES SCOPE</Text>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {Object.entries(project.features || {}).map(([key, val]) => {
                              if (val) {
                                return <Tag key={key} color="cyan" style={{ borderRadius: 8, fontSize: 10 }}>{key}</Tag>;
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: "tech-review",
            label: "Tech Review & Planning",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Row gutter={[24, 24]}>
                  <Col span={24}>
                    <Card size="small" title="Project Stage Progression" style={{ marginBottom: 20 }}>
                      <Steps
                        current={PROJECT_STAGES.findIndex((s) => s.key === project.status)}
                        size="small"
                        items={PROJECT_STAGES.map((s) => ({
                          title: s.shortLabel,
                        }))}
                      />
                    </Card>
                  </Col>
                  
                  <Col xs={24} lg={16}>
                    <Form
                      layout="vertical"
                      initialValues={{
                        feasibilityStatus: project.feasibilityStatus || "Pending",
                        complexity: project.complexity || "Medium",
                        estimatedEffort: project.estimatedEffort,
                        estimatedDeliveryDate: project.estimatedDeliveryDate ? dayjs(project.estimatedDeliveryDate) : null,
                        assumptions: project.assumptions,
                        risks: project.risks,
                        openClarifications: project.openClarifications,
                        recommendedTechStack: project.recommendedTechStack,
                        techOwner: project.techOwner?._id,
                        techTeamMembers: project.techTeamMembers?.map((m: any) => m._id) || [],
                      }}
                      onFinish={(values) => {
                        handleUpdateProjectField({
                          ...values,
                          estimatedDeliveryDate: values.estimatedDeliveryDate ? values.estimatedDeliveryDate.toISOString() : undefined,
                        });
                      }}
                    >
                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item name="feasibilityStatus" label="Feasibility Status">
                            <Select disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} options={[
                              { label: "Pending", value: "Pending" },
                              { label: "Feasible", value: "Feasible" },
                              { label: "Not Feasible", value: "Not Feasible" },
                              { label: "Need Clarification", value: "Need Clarification" },
                            ]} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name="complexity" label="Technical Complexity">
                            <Select disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} options={[
                              { label: "Low Complexity", value: "Low" },
                              { label: "Medium Complexity", value: "Medium" },
                              { label: "High Complexity", value: "High" },
                              { label: "Very High Complexity", value: "Very High" },
                            ]} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item name="estimatedEffort" label="Estimated Effort (e.g. 240 hrs / 6 weeks)">
                            <Input placeholder="e.g. 160 hours" disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name="estimatedDeliveryDate" label="Target Tech Delivery Date">
                            <DatePicker style={{ width: "100%" }} disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item name="recommendedTechStack" label="Recommended Tech Stack / Architecture">
                        <TextArea rows={2} placeholder="e.g. NextJS, Node, MongoDB, Google Cloud Platform" disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                      </Form.Item>

                      <Row gutter={16}>
                        <Col xs={24} md={12}>
                          <Form.Item name="techOwner" label="Tech Lead / Owner">
                            <Select
                              placeholder="Select Tech Lead"
                              disabled={currentUser?.role !== "TECH_MANAGER" && currentUser?.role !== "ADMIN"}
                              options={users.filter(u => u.role === "TECH_TEAM" || u.role === "TECH_MANAGER" || u.role === "ADMIN").map((u) => ({
                                label: `${u.name} (${u.role})`, value: u._id
                              }))}
                              allowClear
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item name="techTeamMembers" label="Tech Team Members Assigned">
                            <Select
                              mode="multiple"
                              placeholder="Select Developers/QA"
                              disabled={currentUser?.role !== "TECH_MANAGER" && currentUser?.role !== "ADMIN"}
                              options={users.filter(u => u.role === "TECH_TEAM" || u.role === "TECH_MANAGER").map((u) => ({
                                label: `${u.name} (${u.role})`, value: u._id
                              }))}
                            />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Form.Item name="assumptions" label="Tech Assumptions">
                        <TextArea rows={2} placeholder="Define any core development assumptions..." disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                      </Form.Item>

                      <Form.Item name="risks" label="Risks & Mitigation Plan">
                        <TextArea rows={2} placeholder="List identified risks and how they will be mitigated..." disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                      </Form.Item>

                      <Form.Item name="openClarifications" label="Open Technical Clarifications Required">
                        <TextArea rows={2} placeholder="Clarifications needed from client team before start..." disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                      </Form.Item>

                      {(currentUser?.role !== "SALES" && currentUser?.role !== "SALES_TEAM") && (
                        <div style={{ textAlign: "right", marginTop: 16 }}>
                          <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>
                            Save Tech Review & Assignments
                          </Button>
                        </div>
                      )}
                    </Form>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Card size="small" title="Transition Project Stage" style={{ borderRadius: 8, backgroundColor: "#fafafa" }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Change Stage Status</Text>
                      <Select
                        style={{ width: "100%", marginTop: 8, marginBottom: 12 }}
                        value={project.status}
                        onChange={(val) => {
                          handleUpdateProjectField({ status: val });
                        }}
                        options={PROJECT_STAGES.map((s) => ({ label: s.label, value: s.key })).filter((opt) => {
                          if (currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM") {
                            return ["Requirement Created", "Submitted for Tech Review", "Clarification Required", "Signoff Pending"].includes(opt.value);
                          }
                          return true;
                        })}
                      />
                      <Text type="secondary" style={{ fontSize: 11, fontStyle: "italic" }}>
                        Note: Restricting status modifications based on team roles (Sales vs Tech Delivery vs Tech Manager).
                      </Text>
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: "work-items",
            label: "Work Items & Tasks",
            children: (
              <div style={{ padding: "12px 0" }}>
                {/* Filters Row */}
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <Space size={12} wrap>
                    <Select value={workFilterStatus} onChange={setWorkFilterStatus} style={{ width: 120 }}>
                      <Select.Option value="All">All Statuses</Select.Option>
                      {["Backlog", "To Do", "In Progress", "Blocked", "In Review", "Testing", "Done", "Cancelled"].map(s => (
                        <Select.Option key={s} value={s}>{s}</Select.Option>
                      ))}
                    </Select>
                    <Select value={workFilterAssignee} onChange={setWorkFilterAssignee} style={{ width: 150 }} placeholder="Assignee">
                      <Select.Option value="All">All Assignees</Select.Option>
                      {users.map(u => (
                        <Select.Option key={u._id} value={u._id}>{u.name}</Select.Option>
                      ))}
                    </Select>
                    <Select value={workFilterSprint} onChange={setWorkFilterSprint} style={{ width: 140 }} placeholder="Sprint">
                      <Select.Option value="All">All Sprints</Select.Option>
                      {sprints.map(s => (
                        <Select.Option key={s._id} value={s._id}>{s.name}</Select.Option>
                      ))}
                    </Select>
                    <Select value={workFilterPriority} onChange={setWorkFilterPriority} style={{ width: 120 }} placeholder="Priority">
                      <Select.Option value="All">All Priorities</Select.Option>
                      {["Low", "Medium", "High", "Urgent"].map(p => (
                        <Select.Option key={p} value={p}>{p}</Select.Option>
                      ))}
                    </Select>
                    <Checkbox checked={workFilterOverdue} onChange={e => setWorkFilterOverdue(e.target.checked)}>
                      Show Overdue Only
                    </Checkbox>
                  </Space>

                  <Space>
                    <Radio.Group value={workViewMode} onChange={e => setWorkViewMode(e.target.value)}>
                      <Radio.Button value="table"><ListFilter size={14} style={{ display: "inline-block", verticalAlign: "middle" }} /> Table</Radio.Button>
                      <Radio.Button value="kanban"><KanbanSquare size={14} style={{ display: "inline-block", verticalAlign: "middle" }} /> Kanban</Radio.Button>
                    </Radio.Group>
                    {(currentUser?.role !== "SALES" && currentUser?.role !== "SALES_TEAM") && (
                      <Button type="primary" icon={<Plus size={14} />} onClick={() => setIsWorkItemModalOpen(true)} style={{ backgroundColor: "#00897b", border: "none" }}>
                        Create Work Item
                      </Button>
                    )}
                  </Space>
                </div>

                {/* View Mode Render */}
                {workViewMode === "table" ? (
                  <Table
                    dataSource={filteredWorkItems}
                    rowKey="_id"
                    size="small"
                    onRow={(record) => ({
                      onClick: () => {
                        setSelectedWorkItem(record);
                        setWorkItemDetailOpen(true);
                      }
                    })}
                    columns={[
                      {
                        title: "ID/Title",
                        key: "title",
                        render: (_, record) => (
                          <div>
                            <Text strong style={{ color: "#00897b", cursor: "pointer" }}>{record.title}</Text>
                            <div style={{ fontSize: 10, color: "#999" }}>Type: {record.type} | Module: {record.module || "General"}</div>
                          </div>
                        ),
                      },
                      {
                        title: "Assignee",
                        dataIndex: ["assignee", "name"],
                        key: "assignee",
                        render: (name) => name || <Text type="secondary">Unassigned</Text>
                      },
                      {
                        title: "Sprint",
                        dataIndex: ["sprint", "name"],
                        key: "sprint",
                        render: (name) => name || <Text type="secondary">Backlog</Text>
                      },
                      {
                        title: "Priority",
                        dataIndex: "priority",
                        key: "priority",
                        render: (p: string) => <Tag color={p === "Urgent" ? "red" : p === "High" ? "orange" : "blue"}>{p}</Tag>
                      },
                      {
                        title: "Status",
                        dataIndex: "status",
                        key: "status",
                        render: (s: string) => <Tag color={s === "Done" ? "green" : s === "Blocked" ? "red" : "default"}>{s}</Tag>
                      },
                      {
                        title: "Progress",
                        dataIndex: "progress",
                        key: "progress",
                        render: (p) => <Progress percent={p} size="small" />
                      },
                      {
                        title: "Hours",
                        key: "hours",
                        render: (_, record) => `${record.actualHours || 0}/${record.estimatedHours || 0} hrs`
                      },
                      {
                        title: "Due Date",
                        dataIndex: "dueDate",
                        key: "dueDate",
                        render: (d) => d ? dayjs(d).format("DD MMM YYYY") : "N/A"
                      }
                    ]}
                  />
                ) : (
                  // Kanban View
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12 }}>
                    {["To Do", "In Progress", "Blocked", "In Review", "Testing", "Done"].map((colStatus) => {
                      const itemsInCol = filteredWorkItems.filter(w => w.status === colStatus);
                      return (
                        <div key={colStatus} style={{ flex: "0 0 200px", minWidth: 200, backgroundColor: "#f5f5f5", borderRadius: 8, padding: 8, minHeight: 300 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontWeight: 600 }}>
                            <Text>{colStatus}</Text>
                            <Badge count={itemsInCol.length} style={{ backgroundColor: "#8c8c8c" }} />
                          </div>
                          <Space direction="vertical" style={{ width: "100%" }} size={8}>
                            {itemsInCol.map((item) => (
                              <Card
                                key={item._id}
                                size="small"
                                style={{ borderRadius: 6, cursor: "pointer", borderLeft: `4px solid ${item.priority === "Urgent" ? "#ff4d4f" : item.priority === "High" ? "#fa8c16" : "#1890ff"}` }}
                                bodyStyle={{ padding: 8 }}
                                onClick={() => {
                                  setSelectedWorkItem(item);
                                  setWorkItemDetailOpen(true);
                                }}
                              >
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{item.title}</div>
                                <div style={{ fontSize: 10, color: "#6b7280", marginTop: 4 }}>
                                  Type: <Text strong>{item.type}</Text>
                                </div>
                                <div style={{ fontSize: 10, color: "#6b7280" }}>
                                  Assigned: {item.assignee?.name || "Unassigned"}
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                                  <Progress percent={item.progress} size="small" showInfo={false} style={{ width: "60%" }} />
                                  <span style={{ fontSize: 9, fontWeight: 500 }}>{item.actualHours || 0}/{item.estimatedHours || 0}h</span>
                                </div>
                              </Card>
                            ))}
                          </Space>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          },
          {
            key: "sprints",
            label: "Agile Sprints",
            children: (
              <div style={{ padding: "12px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <Title level={5} style={{ margin: 0 }}>Interactive Sprint Management Board</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Drag and drop task cards to assign them between Active Sprint, Planned Sprints, or Product Backlog.
                    </Text>
                  </div>
                  {(currentUser?.role === "TECH_MANAGER" || currentUser?.role === "ADMIN") && (
                    <Button type="primary" icon={<Plus size={14} />} onClick={() => setIsSprintModalOpen(true)} style={{ backgroundColor: "#00897b", border: "none" }}>
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
                        <Card size="small" style={{ backgroundColor: "#fffbe6", borderColor: "#ffe58f", borderRadius: 10 }}>
                          <Row justify="space-between" align="middle">
                            <Col>
                              <Text strong style={{ color: "#d48806" }}>No Active Sprint currently running.</Text>
                              <div style={{ fontSize: 12, color: "#8c6b00" }}>Start a planned sprint below or create a new sprint to begin iteration tracking.</div>
                            </Col>
                          </Row>
                        </Card>
                      );
                    }

                    const activeTasks = workItems.filter((w) => w.sprint?._id === activeSprint._id);
                    const completedTasks = activeTasks.filter((w) => w.status === "Done");
                    const openTasks = activeTasks.filter((w) => w.status !== "Done" && w.status !== "Cancelled");
                    const totalEstHours = activeTasks.reduce((sum, w) => sum + (w.estimatedHours || 0), 0);
                    const totalActHours = activeTasks.reduce((sum, w) => sum + (w.actualHours || 0), 0);
                    const daysLeft = dayjs(activeSprint.endDate).diff(dayjs(), "day");

                    return (
                      <Card
                        key={activeSprint._id}
                        style={{
                          borderRadius: 12,
                          borderColor: dragOverSprintId === activeSprint._id ? "#00897b" : "#52c41a",
                          borderWidth: dragOverSprintId === activeSprint._id ? 2 : 1,
                          boxShadow: "0 4px 14px rgba(82,196,26,0.12)",
                          backgroundColor: dragOverSprintId === activeSprint._id ? "#e6f7ff" : "#fafafa",
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverSprintId !== activeSprint._id) setDragOverSprintId(activeSprint._id);
                        }}
                        onDragLeave={() => {
                          if (dragOverSprintId === activeSprint._id) setDragOverSprintId(null);
                        }}
                        onDrop={() => handleDropWorkItemToSprint(draggedWorkItemId, activeSprint._id)}
                      >
                        {/* Active Sprint Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                          <div>
                            <Space align="center">
                              <Tag color="success" style={{ fontWeight: 600, fontSize: 11, borderRadius: 4 }}>CURRENT ACTIVE SPRINT</Tag>
                              <Title level={4} style={{ margin: 0 }}>{activeSprint.name}</Title>
                            </Space>
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 12 }}>Goal: </Text>
                              <Text style={{ fontStyle: "italic", fontSize: 13 }}>{activeSprint.goal || "No specific goal provided."}</Text>
                            </div>
                          </div>

                          <Space align="center" wrap>
                            <Tag color={daysLeft < 0 ? "error" : daysLeft <= 2 ? "warning" : "blue"} style={{ borderRadius: 6, fontSize: 12, padding: "4px 8px" }}>
                              <CalendarIcon size={12} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 4 }} />
                              {dayjs(activeSprint.startDate).format("DD MMM")} — {dayjs(activeSprint.endDate).format("DD MMM YYYY")}
                              {daysLeft >= 0 ? ` (${daysLeft} days left)` : ` (Overdue by ${Math.abs(daysLeft)} days)`}
                            </Tag>

                            {(currentUser?.role === "TECH_MANAGER" || currentUser?.role === "ADMIN") && (
                              <Button
                                type="primary"
                                onClick={() => handleOpenCompleteSprintModal(activeSprint)}
                                style={{ backgroundColor: "#1890ff", border: "none", fontWeight: 600 }}
                              >
                                Complete Sprint ({openTasks.length} open)
                              </Button>
                            )}
                          </Space>
                        </div>

                        {/* Progress Bar & Metrics Banner */}
                        <Row gutter={[16, 16]} style={{ backgroundColor: "#fff", padding: 12, borderRadius: 8, marginBottom: 16, border: "1px solid #f0f0f0" }}>
                          <Col xs={24} md={10}>
                            <Text type="secondary" style={{ fontSize: 11 }}>SPRINT PROGRESS</Text>
                            <Progress percent={activeSprint.progressPercent || 0} strokeColor="#52c41a" status="active" />
                          </Col>
                          <Col xs={12} md={7}>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>WORK ITEMS</Text>
                            <Text strong>{completedTasks.length} completed</Text> / <Text type="secondary">{activeTasks.length} total tasks</Text>
                          </Col>
                          <Col xs={12} md={7}>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>HOURS ESTIMATE</Text>
                            <Text strong>{totalActHours} hrs logged</Text> / <Text type="secondary">{totalEstHours} hrs estimated</Text>
                          </Col>
                        </Row>

                        {/* Active Sprint Draggable Task List */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 13 }}>Tasks in Active Sprint ({activeTasks.length})</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>Drop items here to assign to Active Sprint</Text>
                          </div>

                          {activeTasks.length === 0 ? (
                            <div style={{ padding: 24, textAlign: "center", border: "2px dashed #d9d9d9", borderRadius: 8, backgroundColor: "#fff" }}>
                              <Text type="secondary">No tasks assigned to Active Sprint. Drag work items from the Backlog below!</Text>
                            </div>
                          ) : (
                            <Row gutter={[12, 12]}>
                              {activeTasks.map((item) => (
                                <Col xs={24} sm={12} md={8} lg={6} key={item._id}>
                                  <div
                                    draggable
                                    onDragStart={() => setDraggedWorkItemId(item._id)}
                                    onClick={() => { setSelectedWorkItem(item); setWorkItemDetailOpen(true); }}
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
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                      <Tag color={item.type === "Bug" ? "red" : item.type === "Feature" ? "cyan" : "blue"} style={{ fontSize: 10, margin: 0 }}>
                                        {item.type}
                                      </Tag>
                                      <Tag color={item.priority === "Urgent" ? "red" : item.priority === "High" ? "orange" : "default"} style={{ fontSize: 10, margin: 0 }}>
                                        {item.priority}
                                      </Tag>
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937", marginBottom: 6, lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                      {item.title}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 6, borderTop: "1px solid #f5f5f5" }}>
                                      <Tag color={item.status === "Done" ? "green" : item.status === "Blocked" ? "volcano" : "processing"} style={{ fontSize: 10, margin: 0 }}>
                                        {item.status}
                                      </Tag>
                                      <Text type="secondary" style={{ fontSize: 11 }}>{item.assignee?.name || "Unassigned"}</Text>
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
                    <Title level={5} style={{ marginBottom: 12 }}>Planned Sprints</Title>
                    {(() => {
                      const plannedSprints = sprints.filter((s) => s.status === "Planned");
                      if (plannedSprints.length === 0) {
                        return (
                          <Card size="small" style={{ borderRadius: 8, backgroundColor: "#fafafa", textAlign: "center", color: "#8c8c8c" }}>
                            No planned upcoming sprints. Create a new sprint to plan future iterations.
                          </Card>
                        );
                      }

                      return (
                        <Space direction="vertical" size={16} style={{ width: "100%" }}>
                          {plannedSprints.map((sprint) => {
                            const sprintTasks = workItems.filter((w) => w.sprint?._id === sprint._id);
                            const daysRange = `${dayjs(sprint.startDate).format("DD MMM")} — ${dayjs(sprint.endDate).format("DD MMM YYYY")}`;

                            return (
                              <Card
                                key={sprint._id}
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  borderColor: dragOverSprintId === sprint._id ? "#00897b" : "#d9d9d9",
                                  borderWidth: dragOverSprintId === sprint._id ? 2 : 1,
                                  backgroundColor: dragOverSprintId === sprint._id ? "#e6f7ff" : "#fff",
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  if (dragOverSprintId !== sprint._id) setDragOverSprintId(sprint._id);
                                }}
                                onDragLeave={() => {
                                  if (dragOverSprintId === sprint._id) setDragOverSprintId(null);
                                }}
                                onDrop={() => handleDropWorkItemToSprint(draggedWorkItemId, sprint._id)}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                                  <Space align="center">
                                    <Tag color="blue" style={{ fontWeight: 600 }}>PLANNED</Tag>
                                    <Title level={5} style={{ margin: 0 }}>{sprint.name}</Title>
                                    <Text type="secondary" style={{ fontSize: 12 }}>({daysRange})</Text>
                                  </Space>

                                  <Space>
                                    <Badge count={`${sprintTasks.length} tasks`} style={{ backgroundColor: "#108ee9" }} />
                                    {(currentUser?.role === "TECH_MANAGER" || currentUser?.role === "ADMIN") && (
                                      <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => handleUpdateSprintStatus(sprint._id, "Active")}
                                        style={{ backgroundColor: "#52c41a", border: "none" }}
                                      >
                                        Start Sprint
                                      </Button>
                                    )}
                                  </Space>
                                </div>

                                {sprint.goal && (
                                  <div style={{ fontSize: 12, color: "#666", marginBottom: 10, fontStyle: "italic" }}>
                                    Goal: {sprint.goal}
                                  </div>
                                )}

                                {/* Draggable Tasks in Planned Sprint */}
                                <div style={{ minHeight: 45, padding: 8, backgroundColor: "#fafafa", borderRadius: 6, border: "1px dashed #e8e8e8" }}>
                                  {sprintTasks.length === 0 ? (
                                    <Text type="secondary" style={{ fontSize: 11 }}>No tasks assigned. Drag work items here to assign to this sprint.</Text>
                                  ) : (
                                    <Row gutter={[8, 8]}>
                                      {sprintTasks.map((item) => (
                                        <Col xs={24} sm={12} md={8} lg={6} key={item._id}>
                                          <div
                                            draggable
                                            onDragStart={() => setDraggedWorkItemId(item._id)}
                                            onClick={() => { setSelectedWorkItem(item); setWorkItemDetailOpen(true); }}
                                            style={{
                                              padding: 8,
                                              backgroundColor: "#fff",
                                              borderRadius: 6,
                                              border: "1px solid #d9d9d9",
                                              cursor: "grab",
                                              fontSize: 12,
                                            }}
                                          >
                                            <div style={{ fontWeight: 600, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                              {item.title}
                                            </div>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#8c8c8c" }}>
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
                            <Badge count={backlogItems.length} style={{ backgroundColor: "#8c8c8c" }} />
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
                            <Text type="secondary" style={{ fontSize: 12 }}>All work items are currently assigned to sprints!</Text>
                          ) : (
                            <Row gutter={[10, 10]}>
                              {backlogItems.map((item) => (
                                <Col xs={24} sm={12} md={8} lg={6} key={item._id}>
                                  <div
                                    draggable
                                    onDragStart={() => setDraggedWorkItemId(item._id)}
                                    onClick={() => { setSelectedWorkItem(item); setWorkItemDetailOpen(true); }}
                                    style={{
                                      padding: 10,
                                      backgroundColor: "#fafafa",
                                      borderRadius: 6,
                                      border: "1px solid #e0e0e0",
                                      cursor: "grab",
                                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                      <Tag color={item.type === "Bug" ? "red" : "cyan"} style={{ fontSize: 10, margin: 0 }}>
                                        {item.type}
                                      </Tag>
                                      <Tag color={item.priority === "Urgent" ? "red" : "default"} style={{ fontSize: 10, margin: 0 }}>
                                        {item.priority}
                                      </Tag>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#222", lineClamp: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                      {item.title}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, color: "#666" }}>
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
                      <Card size="small" title={`Completed Sprints (${completed.length})`} style={{ borderRadius: 10, backgroundColor: "#fafafa" }}>
                        <List
                          size="small"
                          dataSource={completed}
                          renderItem={(sprint) => (
                            <List.Item key={sprint._id}>
                              <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                  <Text strong style={{ textDecoration: "line-through", color: "#8c8c8c" }}>{sprint.name}</Text>
                                  <div style={{ fontSize: 11, color: "#8c8c8c" }}>
                                    {dayjs(sprint.startDate).format("DD MMM YYYY")} — {dayjs(sprint.endDate).format("DD MMM YYYY")}
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
            )
          },
          {
            key: "testing",
            label: "Testing & UAT",
            children: (
              <div style={{ padding: "12px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div>
                    <Text strong>UAT Status: </Text>
                    <Select
                      style={{ width: 160, marginLeft: 8 }}
                      value={project.uatStatus || "Not Started"}
                      disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"}
                      onChange={(val) => {
                        handleUpdateProjectField({ uatStatus: val });
                      }}
                      options={[
                        { label: "Not Started", value: "Not Started" },
                        { label: "In Progress", value: "In Progress" },
                        { label: "Issues Found", value: "Issues Found" },
                        { label: "Passed", value: "Passed" },
                        { label: "Client Accepted", value: "Client Accepted" },
                        { label: "Rejected", value: "Rejected" },
                      ]}
                    />
                  </div>
                  {(currentUser?.role !== "SALES" && currentUser?.role !== "SALES_TEAM") && (
                    <Button type="primary" icon={<Plus size={14} />} onClick={() => setIsTestCaseModalOpen(true)} style={{ backgroundColor: "#00897b", border: "none" }}>
                      Create Test Case
                    </Button>
                  )}
                </div>

                <Table
                  dataSource={testCases}
                  rowKey="_id"
                  size="small"
                  columns={[
                    {
                      title: "Test Case Title",
                      dataIndex: "title",
                      key: "title",
                      render: (t) => <Text strong>{t}</Text>
                    },
                    {
                      title: "Steps / Expected",
                      key: "steps_expected",
                      render: (_, record) => (
                        <div style={{ fontSize: 11 }}>
                          <div><span style={{ color: "#6b7280" }}>Steps: </span>{record.steps || "None"}</div>
                          <div><span style={{ color: "#6b7280" }}>Expected: </span>{record.expectedResult || "None"}</div>
                        </div>
                      )
                    },
                    {
                      title: "Actual Result",
                      dataIndex: "actualResult",
                      key: "actualResult",
                      render: (act) => act || <Text type="secondary">Not recorded</Text>
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      key: "status",
                      render: (s: string) => {
                        let color = "default";
                        if (s === "Passed") color = "green";
                        if (s === "Failed") color = "red";
                        if (s === "Retest") color = "orange";
                        if (s === "Blocked") color = "volcano";
                        return <Tag color={color}>{s}</Tag>;
                      }
                    },
                    {
                      title: "Run By",
                      dataIndex: ["testedBy", "name"],
                      key: "testedBy",
                      render: (n) => n || "N/A"
                    },
                    {
                      title: "Actions",
                      key: "actions",
                      render: (_, record) => (
                        <Space>
                          {(currentUser?.role !== "SALES" && currentUser?.role !== "SALES_TEAM") && (
                            <Button size="small" type="primary" onClick={() => { setSelectedTestCase(record); setIsRunTestModalOpen(true); }} style={{ backgroundColor: "#00897b", border: "none" }}>
                              Run
                            </Button>
                          )}
                          {record.status === "Failed" && (
                            <Button size="small" danger onClick={() => handleQuickBugCreation(record)}>
                              Log Bug
                            </Button>
                          )}
                        </Space>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: "signoff",
            label: "Delivery Signoff & Closure",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Row gutter={[24, 24]}>
                  <Col xs={24} lg={16}>
                    <Space direction="vertical" size={20} style={{ width: "100%" }}>
                      <Card size="small" title="1. Handover Checklist">
                        <Form
                          layout="vertical"
                          initialValues={{
                            deliveredModules: project.deliveredModules,
                            pendingItems: project.pendingItems,
                            knownLimitations: project.knownLimitations,
                            handoverDocs: project.handoverDocs,
                            trainingCompleted: !!project.trainingCompleted,
                            uatPassed: !!project.uatPassed,
                          }}
                          onFinish={(values) => {
                            handleUpdateProjectField(values);
                          }}
                        >
                          <Form.Item name="deliveredModules" label="Delivered Modules / Features checklist">
                            <TextArea rows={2} placeholder="e.g. Visitor entry, Badge printing, Cloud sync" disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                          </Form.Item>
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <Form.Item name="pendingItems" label="Pending / Deferred scope items">
                                <TextArea rows={2} placeholder="e.g. Biometric kiosk sync deferred to Phase 2" disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                              <Form.Item name="knownLimitations" label="Known limitations / Bugs">
                                <TextArea rows={2} placeholder="e.g. Offline queue holds max 100 entries before push" disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Form.Item name="handoverDocs" label="Handover Documents links (PDF / Wikis)">
                            <Input placeholder="e.g. https://wiki.biometrik.in/projects/doc1" disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"} />
                          </Form.Item>
                          <Space size={20} style={{ marginBottom: 12 }}>
                            <Form.Item name="trainingCompleted" valuePropName="checked" noStyle>
                              <Checkbox disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"}>End-User Training Completed</Checkbox>
                            </Form.Item>
                            <Form.Item name="uatPassed" valuePropName="checked" noStyle>
                              <Checkbox disabled={currentUser?.role === "SALES" || currentUser?.role === "SALES_TEAM"}>UAT Passed Checklist</Checkbox>
                            </Form.Item>
                          </Space>
                          {(currentUser?.role !== "SALES" && currentUser?.role !== "SALES_TEAM") && (
                            <div style={{ textAlign: "right" }}>
                              <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>
                                Save Handover Details
                              </Button>
                            </div>
                          )}
                        </Form>
                      </Card>

                      <Card size="small" title="2. Signoffs & Approvals">
                        <Row gutter={[16, 16]}>
                          <Col xs={24} md={12}>
                            <Card size="small" type="inner" title="Internal Tech Manager Approval">
                              <div style={{ marginBottom: 12 }}>
                                {project.internalApproval?.approved ? (
                                  <Tag color="success">Approved By: {project.internalApproval.approvedBy?.name || "Manager"} at {project.internalApproval.approvedAt ? dayjs(project.internalApproval.approvedAt).format("DD MMM YYYY") : ""}</Tag>
                                ) : (
                                  <Tag color="orange">Pending approval</Tag>
                                )}
                              </div>
                              {(currentUser?.role === "TECH_MANAGER" || currentUser?.role === "ADMIN") && (
                                <Switch
                                  checked={!!project.internalApproval?.approved}
                                  onChange={(val) => {
                                    handleUpdateProjectField({
                                      internalApproval: { approved: val }
                                    });
                                  }}
                                  checkedChildren="Approved"
                                  unCheckedChildren="Pending"
                                />
                              )}
                            </Card>
                          </Col>

                          <Col xs={24} md={12}>
                            <Card size="small" type="inner" title="Sales Signoff">
                              <div style={{ marginBottom: 12 }}>
                                {project.salesApproval?.approved ? (
                                  <Tag color="success">Approved By: {project.salesApproval.approvedBy?.name || "Sales Rep"} at {project.salesApproval.approvedAt ? dayjs(project.salesApproval.approvedAt).format("DD MMM YYYY") : ""}</Tag>
                                ) : (
                                  <Tag color="orange">Pending approval</Tag>
                                )}
                              </div>
                              {(currentUser?.role === "SALES_TEAM" || currentUser?.role === "SALES" || currentUser?.role === "ADMIN") && (
                                <Switch
                                  checked={!!project.salesApproval?.approved}
                                  onChange={(val) => {
                                    handleUpdateProjectField({
                                      salesApproval: { approved: val }
                                    });
                                  }}
                                  checkedChildren="Approved"
                                  unCheckedChildren="Pending"
                                />
                              )}
                            </Card>
                          </Col>

                          <Col span={24}>
                            <Card size="small" type="inner" title="Client Acceptance Signoff">
                              <Form
                                layout="horizontal"
                                initialValues={{
                                  clientSignoffStatus: project.clientSignoffStatus || "Pending",
                                  clientApprover: project.clientApprover,
                                  finalRemarks: project.finalRemarks,
                                }}
                                onFinish={(values) => {
                                  handleUpdateProjectField(values);
                                }}
                              >
                                <Row gutter={[16, 16]} align="middle">
                                  <Col xs={24} sm={12} md={8}>
                                    <Form.Item name="clientSignoffStatus" label="Client Status" style={{ marginBottom: 0 }}>
                                      <Select options={[
                                        { label: "Pending Signoff", value: "Pending" },
                                        { label: "Approved & Signed", value: "Approved" },
                                        { label: "Waived / Excluded", value: "Waived" },
                                      ]} />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} sm={12} md={8}>
                                    <Form.Item name="clientApprover" label="Client Approver" style={{ marginBottom: 0 }}>
                                      <Input placeholder="Client Name / Email" />
                                    </Form.Item>
                                  </Col>
                                  <Col xs={24} md={8} style={{ alignSelf: "flex-end", textAlign: "right", marginTop: 8 }}>
                                    <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none", width: "100%" }}>
                                      Save Client Signoff
                                    </Button>
                                  </Col>
                                </Row>
                                <div style={{ marginTop: 12 }}>
                                  <Form.Item name="finalRemarks" label="Final Closure Remarks" style={{ marginBottom: 0 }}>
                                    <TextArea rows={2} placeholder="Add final remarks for archive references..." />
                                  </Form.Item>
                                </div>
                              </Form>
                            </Card>
                          </Col>
                        </Row>
                      </Card>
                    </Space>
                  </Col>

                  <Col xs={24} lg={8}>
                    <Card size="small" title="Project Closure Gate" style={{ borderRadius: 8, backgroundColor: "#fafafa" }}>
                      <Text strong style={{ display: "block", marginBottom: 12 }}>Strict Closure checklist:</Text>
                      <Space direction="vertical" size={8} style={{ width: "100%" }}>
                        <div>
                          {closureVerification.workItemsDone ? (
                            <Tag color="success">✓ All Work Items Done/Cancelled</Tag>
                          ) : (
                            <Tag color="error">✗ Active Work Items Pending</Tag>
                          )}
                        </div>
                        <div>
                          {closureVerification.criticalBlockersResolved ? (
                            <Tag color="success">✓ Critical Blockers Resolved</Tag>
                          ) : (
                            <Tag color="error">✗ Open Critical Blockers Exist</Tag>
                          )}
                        </div>
                        <div>
                          {closureVerification.testCasesPassed ? (
                            <Tag color="success">✓ All Test Cases Passed</Tag>
                          ) : (
                            <Tag color="error">✗ Incomplete/Failed Test Cases</Tag>
                          )}
                        </div>
                        <div>
                          {closureVerification.uatPassed ? (
                            <Tag color="success">✓ UAT Passed / Accepted</Tag>
                          ) : (
                            <Tag color="error">✗ UAT Not Passed</Tag>
                          )}
                        </div>
                        <div>
                          {closureVerification.internalApproved ? (
                            <Tag color="success">✓ Internal Delivery Approved</Tag>
                          ) : (
                            <Tag color="error">✗ Internal Delivery Pending</Tag>
                          )}
                        </div>
                        <div>
                          {closureVerification.salesApproved ? (
                            <Tag color="success">✓ Sales Signoff Approved</Tag>
                          ) : (
                            <Tag color="error">✗ Sales Signoff Pending</Tag>
                          )}
                        </div>
                        <div>
                          {closureVerification.clientSignoff ? (
                            <Tag color="success">✓ Client Signoff Completed/Waived</Tag>
                          ) : (
                            <Tag color="error">✗ Client Signoff Pending</Tag>
                          )}
                        </div>
                      </Space>
                      
                      <Divider style={{ margin: "16px 0" }} />

                      {project.status === "Closed" ? (
                        <div style={{ textAlign: "center", padding: 12 }}>
                          <CheckCircle size={32} color="#52c41a" style={{ margin: "0 auto 8px" }} />
                          <Title level={5} style={{ margin: 0 }}>Project Closed</Title>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Closed by: {project.projectClosedBy?.name || "N/A"} at {project.projectClosedAt ? dayjs(project.projectClosedAt).format("DD MMM YYYY") : ""}
                          </Text>
                        </div>
                      ) : (
                        <div>
                          {!isClosureGatePassed && (
                            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12, padding: 8, backgroundColor: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 6 }}>
                              <ShieldAlert size={16} color="#ff4d4f" style={{ marginTop: 2 }} />
                              <Text type="danger" style={{ fontSize: 11 }}>
                                Closure gate is locked. All checklist requirements must pass before closure is permitted.
                              </Text>
                            </div>
                          )}
                          <Button
                            type="primary"
                            danger
                            block
                            disabled={!isClosureGatePassed || (currentUser?.role !== "TECH_MANAGER" && currentUser?.role !== "ADMIN")}
                            onClick={() => {
                              handleUpdateProjectField({ status: "Closed" });
                            }}
                          >
                            Close & Archive Project
                          </Button>
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: "3",
            label: "Collaborative Chat",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Row gutter={[24, 24]}>
                  {/* Messages list */}
                  <Col xs={24} lg={18}>
                    <Card size="small" bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: "hidden" }}>
                      <div style={{ height: 420, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, backgroundColor: "#fafafa" }}>
                        {chatMessages.length === 0 ? (
                          <div style={{ textAlign: "center", marginTop: 100 }}>
                            <MessageSquare size={32} color="#ccc" style={{ margin: "0 auto 8px" }} />
                            <Text type="secondary">No messages yet. Start conversation between tech and sales team!</Text>
                          </div>
                        ) : (
                          chatMessages.map((msg) => (
                            <div key={msg._id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                              <Avatar icon={<UserIcon size={14} />} style={{ backgroundColor: msg.senderId?.role === "TECH_TEAM" || msg.senderId?.role === "TECH_MANAGER" ? "#1890ff" : "#ffcd00" }} />
                              <div style={{ flex: 1, backgroundColor: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e8e8e8" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                                  <Space size={6}>
                                    <Text strong style={{ fontSize: 12 }}>{msg.senderId?.name}</Text>
                                    <Tag color={msg.senderId?.role === "TECH_TEAM" || msg.senderId?.role === "TECH_MANAGER" ? "blue" : msg.senderId?.role === "ADMIN" ? "red" : "gold"} style={{ fontSize: 9 }}>
                                      {msg.senderId?.role}
                                    </Tag>
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: 10 }}>{dayjs(msg.createdAt).format("h:mm A")}</Text>
                                </div>
                                <Paragraph style={{ margin: "4px 0 0 0", fontSize: 12 }}>{msg.message}</Paragraph>

                                {msg.mentions && msg.mentions.length > 0 && (
                                  <div style={{ marginTop: 4 }}>
                                    {msg.mentions.map((m: any) => (
                                      <Tag key={m._id} color="geekblue" style={{ fontSize: 10 }}>@{m.name}</Tag>
                                    ))}
                                  </div>
                                )}

                                {msg.attachment?.url && (
                                  <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", backgroundColor: "#f0f2f5", borderRadius: 4, width: "fit-content" }}>
                                    <Paperclip size={12} />
                                    <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#1890ff" }}>
                                      {msg.attachment.name}
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={chatBottomRef} />
                      </div>

                      {/* Chat Input panel */}
                      <div style={{ padding: 12, borderTop: "1px solid #e8e8e8" }}>
                        <form onSubmit={handleSendChatMessage}>
                          <Row gutter={8}>
                            <Col flex="auto">
                              <Input
                                placeholder="Type a message... Type @ to mention team members"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                              />
                            </Col>
                            <Col flex="180px">
                              <Select
                                mode="multiple"
                                style={{ width: "100%" }}
                                placeholder="Mention team..."
                                maxTagCount={1}
                                value={chatMentions}
                                onChange={setChatMentions}
                                options={users.map((u) => ({ label: `@${u.name} (${u.role})`, value: u._id }))}
                              />
                            </Col>
                            <Col flex="32px">
                              <Upload
                                customRequest={handleChatFileUpload}
                                showUploadList={false}
                                disabled={chatUploading}
                              >
                                <Button icon={<Paperclip size={14} />} loading={chatUploading} />
                              </Upload>
                            </Col>
                            <Col flex="60px">
                              <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Send</Button>
                            </Col>
                          </Row>
                          {chatFile && (
                            <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                              <Paperclip size={12} color="#52c41a" />
                              <Text style={{ fontSize: 11 }}>Selected file: <strong style={{ color: "#52c41a" }}>{chatFile.name}</strong></Text>
                              <Button size="small" type="link" danger onClick={() => setChatFile(null)}>Remove</Button>
                            </div>
                          )}
                        </form>
                      </div>
                    </Card>
                  </Col>

                  {/* Members list */}
                  <Col xs={24} lg={6}>
                    <Card size="small" title="Project Stakeholders" style={{ borderRadius: 8 }}>
                      <List
                        size="small"
                        dataSource={[
                          { name: project.createdBy?.name, role: "Sales Owner", email: project.createdBy?.email },
                          { name: project.techOwner?.name, role: "Tech Owner", email: project.techOwner?.email },
                          ...(project.techTeamMembers?.map((m: any) => ({ name: m.name, role: "Developer", email: m.email })) || [])
                        ].filter(member => member.name)}
                        renderItem={item => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={<Avatar icon={<UserIcon size={12} />} />}
                              title={<Text strong style={{ fontSize: 12 }}>{item.name}</Text>}
                              description={<div><Tag color="blue" style={{ fontSize: 9 }}>{item.role}</Tag></div>}
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            )
          },
          {
            key: "4",
            label: "Blockers & Risks",
            children: (
              <div style={{ padding: "12px 0" }}>
                <div style={{ textAlign: "right", marginBottom: 16 }}>
                  <Button type="primary" danger icon={<Plus size={14} />} onClick={() => setIsBlockerModalOpen(true)}>
                    Raise Blocker
                  </Button>
                </div>

                <Table
                  dataSource={blockers}
                  rowKey="_id"
                  size="small"
                  columns={[
                    {
                      title: "Blocker Title",
                      dataIndex: "title",
                      key: "title",
                      render: (t) => <Text strong>{t}</Text>
                    },
                    {
                      title: "Type",
                      dataIndex: "type",
                      key: "type",
                    },
                    {
                      title: "Priority / Impact",
                      key: "priority_impact",
                      render: (_, record) => (
                        <div>
                          <Tag color={getPriorityColor(record.priority)}>{record.priority} Priority</Tag>
                          {record.impact && <Tag color="volcano">{record.impact} Impact</Tag>}
                        </div>
                      )
                    },
                    {
                      title: "Owner (To Resolve)",
                      dataIndex: ["ownerId", "name"],
                      key: "ownerId",
                    },
                    {
                      title: "Status",
                      dataIndex: "status",
                      key: "status",
                      render: (s: string) => <Tag color={s === "Resolved" ? "green" : s === "Open" ? "red" : "orange"}>{s}</Tag>
                    },
                    {
                      title: "Resolution Note",
                      key: "resolution",
                      render: (_, record) => (
                        record.status === "Resolved" ? (
                          <div>
                            <Text type="secondary" style={{ fontSize: 11 }}>{record.resolutionNote}</Text>
                            <div style={{ fontSize: 9, color: "#999" }}>Resolved by {record.resolvedBy?.name || "N/A"}</div>
                          </div>
                        ) : (
                          <Text type="secondary" style={{ fontStyle: "italic", fontSize: 11 }}>Pending resolution</Text>
                        )
                      )
                    },
                    {
                      title: "Action",
                      key: "action",
                      render: (_, record) => (
                        record.status !== "Resolved" ? (
                          <Button size="small" type="primary" onClick={() => { setSelectedBlocker(record); setIsResolveModalOpen(true); }} style={{ backgroundColor: "#52c41a", border: "none" }}>
                            Resolve
                          </Button>
                        ) : null
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: "5",
            label: "Attachments",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Table
                  dataSource={attachments}
                  rowKey="_id"
                  size="small"
                  columns={[
                    {
                      title: "File Name",
                      dataIndex: "originalName",
                      key: "originalName",
                      render: (name, record) => (
                        <Space>
                          <FilePdfOutlined style={{ color: "#ef4444" }} />
                          <Text strong>{name}</Text>
                        </Space>
                      )
                    },
                    {
                      title: "Size",
                      dataIndex: "size",
                      key: "size",
                      render: (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`
                    },
                    {
                      title: "Uploaded By",
                      dataIndex: ["uploadedBy", "name"],
                      key: "uploadedBy",
                    },
                    {
                      title: "Date",
                      dataIndex: "createdAt",
                      key: "createdAt",
                      render: (d) => dayjs(d).format("DD MMM YYYY h:mm A")
                    },
                    {
                      title: "Actions",
                      key: "actions",
                      render: (_, record) => (
                        <Button size="small" icon={<Download size={12} />} onClick={() => window.open(record.url, "_blank")} style={{ border: "1px solid #d9d9d9" }}>
                          Download
                        </Button>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: "6",
            label: "Requirements History",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Timeline
                  mode="left"
                  items={versions.map((ver) => ({
                    label: dayjs(ver.editedAt).format("MMM DD, YYYY h:mm A"),
                    children: (
                      <Card size="small" style={{ marginBottom: 16, borderRadius: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
                          <Text style={{ fontWeight: 600 }}>Version {ver.version} snapshot</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>Edited by: {ver.editedBy?.name} ({ver.editedBy?.role})</Text>
                        </div>
                        <Paragraph style={{ marginTop: 8, fontStyle: "italic", fontSize: 12 }}>
                          Reason: "{ver.changeReason || "No explanation provided."}"
                        </Paragraph>

                        {ver.changedFields && ver.changedFields.length > 0 && (
                          <div style={{ marginTop: 8, backgroundColor: "#fafafa", padding: 8, borderRadius: 6 }}>
                            <Text style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#666", marginBottom: 4 }}>CHANGED FIELDS:</Text>
                            {ver.changedFields.map((ch: any, i: number) => (
                              <div key={i} style={{ fontSize: 11, marginBottom: 4 }}>
                                <Tag color="blue">{ch.field}</Tag>
                                <span style={{ textDecoration: "line-through", color: "#999", marginRight: 8 }}>
                                  {typeof ch.oldValue === "object" ? JSON.stringify(ch.oldValue) : String(ch.oldValue)}
                                </span>
                                <strong>➔</strong>
                                <span style={{ color: "#52c41a", marginLeft: 8 }}>
                                  {typeof ch.newValue === "object" ? JSON.stringify(ch.newValue) : String(ch.newValue)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: 12, textAlign: "right" }}>
                          <Popconfirm title="Are you sure you want to restore this version? This will overwrite the current project specifications." onConfirm={() => handleRestoreVersion(ver._id)}>
                            <Button size="small" icon={<History size={12} />} style={{ border: "1px solid #d9d9d9" }}>
                              Restore this version
                            </Button>
                          </Popconfirm>
                        </div>
                      </Card>
                    )
                  }))}
                />
              </div>
            )
          },
          {
            key: "activities",
            label: "Project Activity Log",
            children: (
              <div style={{ padding: "12px 0" }}>
                <Timeline
                  mode="left"
                  items={activities.map((act) => ({
                    label: dayjs(act.createdAt).format("DD MMM, YYYY h:mm A"),
                    color: act.type === "sprint" ? "blue" : act.type === "work_log" ? "green" : act.type === "project_status" ? "purple" : "gray",
                    children: (
                      <div>
                        <Text strong style={{ fontSize: 12 }}>{act.description}</Text>
                        <div style={{ fontSize: 10, color: "#999" }}>
                          Action by {act.performedBy?.name} ({act.performedBy?.role}) | Category: <Tag style={{ fontSize: 9 }} color="default">{act.type}</Tag>
                        </div>
                      </div>
                    )
                  }))}
                />
              </div>
            )
          }
        ]} />
      </Card>

      {/* Drawer: Work Item Detail Panel */}
      <Drawer
        title={selectedWorkItem ? `${selectedWorkItem.title} (${selectedWorkItem.type})` : "Work Item Detail"}
        placement="right"
        width={550}
        onClose={() => { setSelectedWorkItem(null); setWorkItemDetailOpen(false); }}
        open={workItemDetailOpen}
      >
        {selectedWorkItem && (
          <Space direction="vertical" size={20} style={{ width: "100%" }}>
            <div>
              <Text type="secondary">Description:</Text>
              <Paragraph style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{selectedWorkItem.description || "No description provided."}</Paragraph>
            </div>
            
            <Divider style={{ margin: "4px 0" }} />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>STATUS</Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.status}
                    onChange={(val) => handleUpdateWorkItem(selectedWorkItem._id, { status: val })}
                    options={["Backlog", "To Do", "In Progress", "Blocked", "In Review", "Testing", "Done", "Cancelled"].map(s => ({ label: s, value: s }))}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>PRIORITY</Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.priority}
                    onChange={(val) => handleUpdateWorkItem(selectedWorkItem._id, { priority: val })}
                    options={["Low", "Medium", "High", "Urgent"].map(p => ({ label: p, value: p }))}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>ASSIGNEE</Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.assignee?._id}
                    onChange={(val) => handleUpdateWorkItem(selectedWorkItem._id, { assignee: val })}
                    options={users.map(u => ({ label: u.name, value: u._id }))}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>SPRINT</Text>
                  <Select
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.sprint?._id}
                    onChange={(val) => handleUpdateWorkItem(selectedWorkItem._id, { sprint: val })}
                    options={[
                      { label: "Backlog / No Sprint", value: "" },
                      ...sprints.map(s => ({ label: s.name, value: s._id }))
                    ]}
                  />
                </div>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>EST. HOURS</Text>
                  <Input
                    type="number"
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.estimatedHours}
                    onChange={(e) => handleUpdateWorkItem(selectedWorkItem._id, { estimatedHours: Number(e.target.value) })}
                  />
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div>
                  <Text type="secondary" style={{ fontSize: 11 }}>PROGRESS (% SLIDER)</Text>
                  <Progress percent={selectedWorkItem.progress} style={{ marginTop: 8 }} />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    style={{ width: "100%", marginTop: 4 }}
                    value={selectedWorkItem.progress}
                    onChange={(e) => handleUpdateWorkItem(selectedWorkItem._id, { progress: Number(e.target.value) })}
                  />
                </div>
              </Col>
            </Row>

            <Divider style={{ margin: "4px 0" }} />

            {/* Work Logs Section */}
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>Work Hours Logged ({selectedWorkItem.actualHours || 0} hrs total)</Text>
              <List
                size="small"
                dataSource={selectedWorkItem.workLogs || []}
                renderItem={(log: any) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Text strong style={{ fontSize: 12 }}>{log.hoursSpent} hours by {log.loggedBy?.name || "User"}</Text>}
                      description={<div><span style={{ fontSize: 11 }}>{log.description}</span> <span style={{ fontSize: 10, color: "#999", float: "right" }}>{dayjs(log.date).format("DD MMM")}</span></div>}
                    />
                  </List.Item>
                )}
              />

              <Card size="small" title="Log Hours" style={{ marginTop: 8, borderRadius: 6 }}>
                <Form form={workLogForm} layout="vertical" onFinish={handleAddWorkLog}>
                  <Row gutter={12}>
                    <Col xs={24} sm={12}>
                      <Form.Item name="date" label="Date" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                        <DatePicker style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item name="hoursSpent" label="Hours Spent" rules={[{ required: true }]} style={{ marginBottom: 8 }}>
                        <Input type="number" step="0.5" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="description" label="Work description" style={{ marginBottom: 8 }}>
                    <Input placeholder="Describe what you did..." />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" size="small" style={{ backgroundColor: "#00897b", border: "none" }}>Log Work</Button>
                </Form>
              </Card>
            </div>

            <Divider style={{ margin: "4px 0" }} />

            {/* Comments Section */}
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>Comments</Text>
              <List
                size="small"
                dataSource={selectedWorkItem.comments || []}
                renderItem={(com: any) => (
                  <div style={{ padding: "6px 8px", backgroundColor: "#f9f9f9", borderRadius: 6, marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <Text strong style={{ fontSize: 11 }}>{com.author?.name || "Author"}</Text>
                      <Text type="secondary" style={{ fontSize: 9 }}>{dayjs(com.createdAt).format("DD MMM h:mm A")}</Text>
                    </div>
                    <p style={{ margin: "2px 0 0 0", fontSize: 11 }}>{com.text}</p>
                  </div>
                )}
              />

              <Form form={commentForm} layout="vertical" onFinish={handleAddComment} style={{ marginTop: 8 }}>
                <Form.Item name="text" style={{ marginBottom: 8 }}>
                  <TextArea rows={2} placeholder="Add a comment..." />
                </Form.Item>
                <Button type="primary" htmlType="submit" size="small" style={{ backgroundColor: "#00897b", border: "none" }}>Add Comment</Button>
              </Form>
            </div>

            <Divider style={{ margin: "4px 0" }} />

            {/* Attachments Section */}
            <div>
              <Text strong style={{ display: "block", marginBottom: 8 }}>Task Attachments</Text>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {(selectedWorkItem.attachments || []).map((att: any, idx: number) => (
                  <Tag key={idx} color="blue" style={{ cursor: "pointer" }} onClick={() => window.open(att.url, "_blank")}>
                    <Paperclip size={10} style={{ display: "inline-block", marginRight: 4 }} /> {att.name}
                  </Tag>
                ))}
              </div>
              <Upload customRequest={handleWorkItemUpload} showUploadList={false}>
                <Button size="small" icon={<Paperclip size={12} />}>Upload File Link</Button>
              </Upload>
            </div>
          </Space>
        )}
      </Drawer>

      {/* MODAL 1: Edit Project Details */}
      <Modal
        title="Edit Project Specifications"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        footer={null}
        width={750}
        style={{ top: 40 }}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateProject}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="title" label="Requirement / Project Title" rules={[{ required: true, message: "Please input title" }]}>
                <Input placeholder="e.g. Android Customer Delivery App" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="companyName" label="Company Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contactPerson" label="Contact Person">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Contact Email" rules={[{ required: true, type: "email" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select options={[
                  { label: "Low", value: "Low" },
                  { label: "Medium", value: "Medium" },
                  { label: "High", value: "High" },
                  { label: "Critical", value: "Critical" },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="timeline" label="Timeline Dates" rules={[{ required: true }]}>
                <DatePicker.RangePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="status" label="Project Status" rules={[{ required: true }]}>
                <Select options={PROJECT_STAGES.map((s) => ({ label: s.label, value: s.key }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="Features Scope">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "10px 15px" }}>
                  <Form.Item name="visitorManagement" valuePropName="checked" noStyle><Checkbox>Visitor Mgmt</Checkbox></Form.Item>
                  <Form.Item name="attendanceManagement" valuePropName="checked" noStyle><Checkbox>Attendance Mgmt</Checkbox></Form.Item>
                  <Form.Item name="digilockerAuthentication" valuePropName="checked" noStyle><Checkbox>Digilocker</Checkbox></Form.Item>
                  <Form.Item name="webApp" valuePropName="checked" noStyle><Checkbox>Web App</Checkbox></Form.Item>
                  <Form.Item name="androidApp" valuePropName="checked" noStyle><Checkbox>Android App</Checkbox></Form.Item>
                  <Form.Item name="iosApp" valuePropName="checked" noStyle><Checkbox>iOS App</Checkbox></Form.Item>
                  <Form.Item name="videoKYC" valuePropName="checked" noStyle><Checkbox>Video KYC</Checkbox></Form.Item>
                  <Form.Item name="rbac" valuePropName="checked" noStyle><Checkbox>RBAC System</Checkbox></Form.Item>
                  <Form.Item name="adminPanel" valuePropName="checked" noStyle><Checkbox>Admin Panel</Checkbox></Form.Item>
                  <Form.Item name="online" valuePropName="checked" noStyle><Checkbox>Online</Checkbox></Form.Item>
                  <Form.Item name="offline" valuePropName="checked" noStyle><Checkbox>Offline</Checkbox></Form.Item>
                  <Form.Item name="cloud" valuePropName="checked" noStyle><Checkbox>Cloud</Checkbox></Form.Item>
                  <Form.Item name="onPremise" valuePropName="checked" noStyle><Checkbox>On Premise</Checkbox></Form.Item>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="useCase" label="Use Case / Core Objective">
            <TextArea rows={3} placeholder="What business problem does this solve? Who is the end client?" />
          </Form.Item>

          <Form.Item name="targetUsers" label="Target Users">
            <TextArea rows={2} placeholder="Who are the primary end users? e.g. Warehouse operators, retail customers" />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="functionalRequirements" label="Functional Requirements">
                <TextArea rows={3} placeholder="List out explicit key features, user flows, operations..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nonFunctionalRequirements" label="Non-Functional Requirements">
                <TextArea rows={3} placeholder="e.g. Offline sync support, loading speed, daily volumes..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item name="budget" label="Est. Budget">
                <Input placeholder="e.g. $25k, ₹15L, etc." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="integrations" label="Integrations Needed">
                <Input placeholder="e.g. Razorpay, SendGrid, SAP ERP" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="extraAddOns" label="Extra Add-ons / Client notes">
            <TextArea rows={2} />
          </Form.Item>

          <Form.Item name="changeReason" label="Reason for this change (Logged to Version Control)" rules={[{ required: true, message: "Please specify why you are making this edit." }]}>
            <Input placeholder="e.g. Added functional requirements specified by client on call" />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsEditModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Save Changes</Button>
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
          <Form.Item name="title" label="Task Title" rules={[{ required: true, message: "Task title is required" }]}>
            <Input placeholder="e.g. Clarify payment gateway merchant accounts" />
          </Form.Item>

          <Form.Item name="description" label="Task Description">
            <TextArea rows={3} placeholder="Add specific details or questions to resolve." />
          </Form.Item>

          <Form.Item name="dueDate" label="Due Date & Time" rules={[{ required: true, message: "Select deadline" }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="assignedTo" label="Assign to Employee" rules={[{ required: true, message: "Assignee is required" }]}>
            <Select placeholder="Select team member" options={users.map((u) => ({ label: `${u.name} (${u.role})`, value: u._id }))} />
          </Form.Item>

          <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8, color: "#666" }}>
            <CalendarIcon size={14} color="#00897b" />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tasks will sync automatically if the assignee has connected their Google Calendar.
            </Text>
          </div>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsTaskModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Create Task</Button>
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
          <Form.Item name="title" label="Blocker Title" rules={[{ required: true, message: "Title is required" }]}>
            <Input placeholder="e.g. Missing staging API credentials" />
          </Form.Item>

          <Form.Item name="description" label="Detailed Description">
            <TextArea rows={3} placeholder="Describe what is blocked and how to resolve it." />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="type" label="Blocker Type" rules={[{ required: true }]}>
                <Select placeholder="Select Type" options={[
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
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="priority" label="Blocker Priority" rules={[{ required: true }]}>
                <Select placeholder="Select Priority" options={[
                  { label: "Low", value: "Low" },
                  { label: "Medium", value: "Medium" },
                  { label: "High", value: "High" },
                  { label: "Critical", value: "Critical" },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="ownerId" label="Owner (To Resolve)" rules={[{ required: true }]}>
                <Select placeholder="Select Owner" options={users.map((u) => ({ label: `${u.name} (${u.role})`, value: u._id }))} />
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
                <Select placeholder="Select Work Item" allowClear options={workItems.map(w => ({ label: w.title, value: w._id }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="sprintId" label="Linked Sprint">
                <Select placeholder="Select Sprint" allowClear options={sprints.map(s => ({ label: s.name, value: s._id }))} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="impact" label="Blocker Impact Level">
            <Select placeholder="Select Impact" options={["Low", "Medium", "High", "Blocker", "Critical"].map(i => ({ label: i, value: i }))} />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsBlockerModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#ff4d4f", border: "none" }}>Raise Blocker</Button>
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
          <Form.Item name="resolutionNote" label="Resolution Notes" rules={[{ required: true, message: "Please enter resolution notes" }]}>
            <TextArea rows={4} placeholder="e.g. Client provided API keys on email, staging connection is now active." />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsResolveModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#52c41a", border: "none" }}>Submit Resolution</Button>
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
          <Form.Item name="name" label="Sprint Name" rules={[{ required: true, message: "Name is required" }]}>
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
            <Button onClick={() => setIsSprintModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Create Sprint</Button>
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
        {sprintToComplete && (() => {
          const sprintTasks = workItems.filter((w) => w.sprint?._id === sprintToComplete._id);
          const completedCount = sprintTasks.filter((w) => w.status === "Done").length;
          const openTasks = sprintTasks.filter((w) => w.status !== "Done" && w.status !== "Cancelled");
          const plannedSprints = sprints.filter((s) => s.status === "Planned" && s._id !== sprintToComplete._id);

          return (
            <div style={{ padding: "8px 0" }}>
              <Paragraph>
                This sprint includes <Text strong>{completedCount}</Text> completed tasks and <Text type="danger" strong>{openTasks.length}</Text> incomplete tasks.
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

      {/* WORK ITEM MODAL */}
      <Modal
        title="Create Jira-like Work Item"
        open={isWorkItemModalOpen}
        onCancel={() => setIsWorkItemModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={workItemForm} layout="vertical" onFinish={handleCreateWorkItem}>
          <Form.Item name="title" label="Work Item Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Implement visitor check-in form" />
          </Form.Item>
          <Form.Item name="description" label="Detailed Description">
            <TextArea rows={3} />
          </Form.Item>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select options={["Feature", "Bug", "Task", "Chore"].map(t => ({ label: t, value: t }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="module" label="Scope Module">
                <Input placeholder="e.g. Visitor Mgmt" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="priority" label="Priority" rules={[{ required: true }]}>
                <Select options={["Low", "Medium", "High", "Urgent"].map(p => ({ label: p, value: p }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="assignee" label="Assignee">
                <Select placeholder="Select Assignee" allowClear options={users.map(u => ({ label: u.name, value: u._id }))} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item name="sprint" label="Sprint Assignment">
                <Select placeholder="Assign to Sprint" allowClear options={sprints.map(s => ({ label: s.name, value: s._id }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="dueDate" label="Target Due Date">
                <DatePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="estimatedHours" label="Estimated Development Hours">
            <Input type="number" defaultValue={0} />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsWorkItemModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Create Work Item</Button>
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
            <TextArea rows={3} placeholder="1. Go to visitor login\n2. Enter valid phone number\n3. Click send OTP" />
          </Form.Item>
          <Form.Item name="expectedResult" label="Expected Result">
            <TextArea rows={2} placeholder="OTP code is generated and successfully sent to target device." />
          </Form.Item>
          <Form.Item name="workItemId" label="Linked Work Item">
            <Select placeholder="Link to work item" allowClear options={workItems.map(w => ({ label: w.title, value: w._id }))} />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Button onClick={() => setIsTestCaseModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Create Test Case</Button>
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
            <Select options={[
              { label: "Passed", value: "Passed" },
              { label: "Failed", value: "Failed" },
              { label: "Retest", value: "Retest" },
              { label: "Blocked", value: "Blocked" },
            ]} />
          </Form.Item>
          <Form.Item name="actualResult" label="Actual Verdict Details / Observations" rules={[{ required: true }]}>
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
            <Button onClick={() => setIsRunTestModalOpen(false)} style={{ marginRight: 8 }}>Cancel</Button>
            <Button type="primary" htmlType="submit" style={{ backgroundColor: "#00897b", border: "none" }}>Submit Run Verdict</Button>
          </div>
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
          <FilePdfOutlined style={{ color: "#ef4444" }} />
          <span style={{ fontWeight: 600 }}>Report Preview</span>
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
          icon={<FilePdfOutlined />}
          style={{ background: "#00897b", borderColor: "#00897b" }}
          onClick={() => {
            const link = document.createElement("a");
            link.href = url!;
            link.download = filename;
            link.click();
            onClose();
          }}
        >
          Download PDF
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
