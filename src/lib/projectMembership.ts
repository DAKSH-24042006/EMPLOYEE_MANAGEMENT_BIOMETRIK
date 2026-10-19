/**
 * Shared project membership helpers (dependency-free so they can be reused by
 * API routes, access helpers and tests without loading database models).
 *
 * Membership is represented on the Project document as:
 * - Project Manager:            techOwner
 * - Product Owner:              productOwner
 * - QA / Testing Team Member:   qaLead
 * - Developer / Team Member:    techTeamMembers[]
 */

function toIdString(value: any): string | null {
  if (!value) return null;
  if (value._id) return String(value._id);
  return String(value);
}

/**
 * Returns true if the user holds at least one of the four supported
 * membership roles on the given project (populated or raw ids both supported).
 */
export function isUserAuthorizedProjectMember(project: any, userId: string): boolean {
  if (!project || !userId) return false;
  const uId = String(userId);

  if (toIdString(project.techOwner) === uId) return true;
  if (toIdString(project.productOwner) === uId) return true;
  if (
    Array.isArray(project.productOwners) &&
    project.productOwners.some((po: any) => toIdString(po) === uId)
  ) {
    return true;
  }
  if (toIdString(project.qaLead) === uId) return true;

  if (Array.isArray(project.techTeamMembers)) {
    return project.techTeamMembers.some((m: any) => toIdString(m) === uId);
  }

  return false;
}
