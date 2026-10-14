import mongoose from "mongoose";
import { Role } from "@/lib/constants";
import { Project, IProject } from "@/lib/models/Project";
import { WorkItem } from "@/lib/models/WorkItem";
import { Task } from "@/lib/models/Task";

/**
 * Determines whether a user has permission to view a given project.
 * As per company requirements: All employees and Project Managers can view all projects.
 */
export async function canUserViewProject(
  _projectOrId: string | mongoose.Types.ObjectId | IProject | any,
  userId: string,
  _userRole?: string
): Promise<boolean> {
  // All authenticated employees have visibility to view projects
  return Boolean(userId);
}

/**
 * Constructs a MongoDB query filter to fetch projects visible to the user.
 * As per company requirements: All authenticated users can see all projects in lists.
 */
export async function getProjectViewFilter(
  _userId: string,
  _userRole?: string
): Promise<mongoose.FilterQuery<IProject>> {
  // All authenticated users can view all projects
  return {};
}

/**
 * Determines whether a user has permission to EDIT a given project or its items.
 * Edit access is granted strictly to:
 * 1. Super Admin (SYSTEM_ADMIN or ADMIN)
 * 2. Project Manager designated for that project (techOwner)
 * 3. Product Owner designated for that project (productOwner)
 * 4. The team members working on that project (techTeamMembers or assigned tasks/work items)
 */
export async function canUserEditProject(
  projectOrId: string | mongoose.Types.ObjectId | IProject | any,
  userId: string,
  userRole?: string
): Promise<boolean> {
  if (!userId) return false;

  // 1. Super Admins have unrestricted edit access
  if (userRole === Role.SYSTEM_ADMIN || userRole === "SYSTEM_ADMIN" || userRole === "ADMIN") {
    return true;
  }

  let project: any = projectOrId;
  if (!project || typeof project === "string" || project instanceof mongoose.Types.ObjectId) {
    project = await Project.findById(projectOrId).select(
      "techOwner productOwner qaLead techTeamMembers"
    );
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

  // 3. Product Owner (productOwner)
  const poId = project.productOwner?._id
    ? String(project.productOwner._id)
    : project.productOwner
      ? String(project.productOwner)
      : null;

  if (poId && poId === strUserId) {
    return true;
  }

  // 4. Designated QA Lead (qaLead)
  const qaId = project.qaLead?._id
    ? String(project.qaLead._id)
    : project.qaLead
      ? String(project.qaLead)
      : null;

  if (qaId && qaId === strUserId) {
    return true;
  }

  // 4. Assigned Team Members (techTeamMembers)
  if (Array.isArray(project.techTeamMembers)) {
    const isMember = project.techTeamMembers.some((m: any) => {
      const mId = m?._id ? String(m._id) : String(m);
      return mId === strUserId;
    });
    if (isMember) return true;
  }

  // 5. Assigned to a Work Item or Task within the project
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
