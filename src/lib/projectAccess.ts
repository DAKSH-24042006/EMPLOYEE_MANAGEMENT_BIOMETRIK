import mongoose from "mongoose";
import { Role } from "@/lib/constants";
import { Project, IProject } from "@/lib/models/Project";
import { WorkItem } from "@/lib/models/WorkItem";
import { Task } from "@/lib/models/Task";

/**
 * Determines whether a user has permission to view a given project.
 * Projects can only be seen by:
 * 1. System Administrator (SYSTEM_ADMIN or ADMIN)
 * 2. Project Manager (techOwner)
 * 3. Users assigned to the project (techTeamMembers or assigned tasks/work items)
 */
export async function canUserViewProject(
  projectOrId: string | mongoose.Types.ObjectId | IProject | any,
  userId: string,
  userRole?: string
): Promise<boolean> {
  if (!userId) return false;

  // 1. System Admins have unrestricted access
  if (
    userRole === Role.SYSTEM_ADMIN ||
    userRole === "SYSTEM_ADMIN" ||
    userRole === "ADMIN"
  ) {
    return true;
  }

  let project: any = projectOrId;
  if (!project || typeof project === "string" || project instanceof mongoose.Types.ObjectId) {
    project = await Project.findById(projectOrId).select("techOwner techTeamMembers");
    if (!project) return false;
  }

  const strUserId = String(userId);

  // 2. Project Manager (techOwner)
  const leadId = project.techOwner?._id
    ? String(project.techOwner._id)
    : project.techOwner
    ? String(project.techOwner)
    : null;

  if (leadId && leadId === strUserId) {
    return true;
  }

  // 3. Assigned Team Members (techTeamMembers)
  if (Array.isArray(project.techTeamMembers)) {
    const isMember = project.techTeamMembers.some((m: any) => {
      const mId = m?._id ? String(m._id) : String(m);
      return mId === strUserId;
    });
    if (isMember) return true;
  }

  // 4. Assigned to a Work Item or Task within the project
  const projectId = project._id || projectOrId;
  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const [hasWorkItem, hasTask] = await Promise.all([
    WorkItem.exists({ projectId, assignee: userObjectId }),
    Task.exists({ projectId, assignedTo: userObjectId }),
  ]);

  return Boolean(hasWorkItem || hasTask);
}

/**
 * Constructs a MongoDB query filter to fetch only projects visible to the user:
 * - System Administrators receive `{}` (all projects).
 * - Other users receive a filter that matches where they are:
 *     a) Project Manager (techOwner)
 *     b) In Assigned Members (techTeamMembers)
 *     c) Assigned to a Work Item or Task in the project
 */
export async function getProjectViewFilter(
  userId: string,
  userRole?: string
): Promise<mongoose.FilterQuery<IProject>> {
  // System Admins can view all projects
  if (
    userRole === Role.SYSTEM_ADMIN ||
    userRole === "SYSTEM_ADMIN" ||
    userRole === "ADMIN"
  ) {
    return {};
  }

  if (!userId) {
    return { _id: null }; // Match nothing if user is unknown
  }

  const userObjectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  // Find projects where the user is assigned work items or tasks
  const [workItemProjects, taskProjects] = await Promise.all([
    WorkItem.find({ assignee: userObjectId }).distinct("projectId"),
    Task.find({ assignedTo: userObjectId }).distinct("projectId"),
  ]);

  const assignedProjectIds = Array.from(
    new Set([...workItemProjects.map(String), ...taskProjects.map(String)])
  )
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  return {
    $or: [
      { techOwner: userObjectId },
      { techTeamMembers: userObjectId },
      ...(assignedProjectIds.length > 0
        ? [{ _id: { $in: assignedProjectIds } }]
        : []),
    ],
  };
}
