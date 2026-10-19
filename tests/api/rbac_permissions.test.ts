jest.mock("mongoose", () => {
  class MockObjectId {
    id: string;
    constructor(id?: string) {
      this.id = id || "507f1f77bcf86cd799439011";
    }
    toString() {
      return this.id;
    }
    static isValid(val: any) {
      return typeof val === "string" && val.length === 24;
    }
  }

  return {
    Types: {
      ObjectId: MockObjectId,
    },
  };
});

jest.mock("@/lib/models/Project", () => ({
  Project: {
    findById: jest.fn(),
  },
}));

jest.mock("@/lib/models/WorkItem", () => ({
  WorkItem: {
    exists: jest.fn(),
  },
}));

jest.mock("@/lib/models/Task", () => ({
  Task: {
    exists: jest.fn(),
  },
}));

import { canUserViewProject, canUserEditProject } from "@/lib/projectAccess";
import { Role } from "@/lib/constants";
import { WorkItem } from "@/lib/models/WorkItem";
import { Task } from "@/lib/models/Task";

describe("Phase 4: Permission Matrix Testing (7 User Personas)", () => {
  const projectId = "66f123456789abcdef123456";
  const superAdminId = "66f123456789abcdef123401";
  const pmId = "66f123456789abcdef123402";
  const poId = "66f123456789abcdef123403";
  const qaId = "66f123456789abcdef123404";
  const devId = "66f123456789abcdef123405";
  const unrelatedId = "66f123456789abcdef123406";

  const mockProject = {
    _id: projectId,
    title: "Enterprise Core Platform",
    techOwner: pmId,
    productOwner: poId,
    qaLead: qaId,
    techTeamMembers: [devId],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (WorkItem.exists as jest.Mock).mockResolvedValue(false);
    (Task.exists as jest.Mock).mockResolvedValue(false);
  });

  describe("canUserViewProject — Global Visibility Rule", () => {
    it("Persona 1: Super Admin (Unassigned) can view", async () => {
      const allowed = await canUserViewProject(mockProject, superAdminId, Role.SYSTEM_ADMIN);
      expect(allowed).toBe(true);
    });

    it("Persona 2: Super Admin (PM/PO) can view", async () => {
      const allowed = await canUserViewProject(mockProject, superAdminId, Role.SYSTEM_ADMIN);
      expect(allowed).toBe(true);
    });

    it("Persona 3: Project Manager (techOwner) can view", async () => {
      const allowed = await canUserViewProject(mockProject, pmId, "PROJECT_MANAGER");
      expect(allowed).toBe(true);
    });

    it("Persona 4: Product Owner (productOwner) can view", async () => {
      const allowed = await canUserViewProject(mockProject, poId, "PRODUCT_OWNER");
      expect(allowed).toBe(true);
    });

    it("Persona 5: Assigned Developer (techTeamMember) can view", async () => {
      const allowed = await canUserViewProject(mockProject, devId, "DEVELOPER");
      expect(allowed).toBe(true);
    });

    it("Persona 6: Assigned QA Member (qaLead) can view", async () => {
      const allowed = await canUserViewProject(mockProject, qaId, "QA");
      expect(allowed).toBe(true);
    });

    it("Persona 7: Unrelated Employee (View-Only) can view project", async () => {
      const allowed = await canUserViewProject(mockProject, unrelatedId, "EMPLOYEE");
      expect(allowed).toBe(true);
    });

    it("Anonymous (No userId) is blocked from viewing", async () => {
      const allowed = await canUserViewProject(mockProject, "");
      expect(allowed).toBe(false);
    });
  });

  describe("canUserEditProject — RBAC Matrix Across All 7 Personas", () => {
    it("Persona 1: Super Admin (Unassigned) HAS edit permissions", async () => {
      const allowed = await canUserEditProject(mockProject, superAdminId, Role.SYSTEM_ADMIN);
      expect(allowed).toBe(true);
    });

    it("Persona 2: Super Admin (Assigned) HAS edit permissions", async () => {
      const allowed = await canUserEditProject(mockProject, superAdminId, "ADMIN");
      expect(allowed).toBe(true);
    });

    it("Persona 3: Project Manager (techOwner) HAS edit permissions", async () => {
      const allowed = await canUserEditProject(mockProject, pmId, "EMPLOYEE");
      expect(allowed).toBe(true);
    });

    it("Persona 4: Product Owner (productOwner) HAS edit permissions", async () => {
      const allowed = await canUserEditProject(mockProject, poId, "EMPLOYEE");
      expect(allowed).toBe(true);
    });

    it("Persona 5: Assigned Developer (in techTeamMembers) HAS edit permissions", async () => {
      const allowed = await canUserEditProject(mockProject, devId, "DEVELOPER");
      expect(allowed).toBe(true);
    });

    it("Persona 5: Assigned Developer (via WorkItem assignee) HAS edit permissions", async () => {
      const devAssigneeOnlyId = "66f123456789abcdef123499";
      (WorkItem.exists as jest.Mock).mockResolvedValue(true);

      const allowed = await canUserEditProject(mockProject, devAssigneeOnlyId, "DEVELOPER");
      expect(allowed).toBe(true);
    });

    it("Persona 6: Assigned QA Member (qaLead) HAS edit permissions", async () => {
      const allowed = await canUserEditProject(mockProject, qaId, "QA");
      expect(allowed).toBe(true);
    });

    it("Persona 7: Unrelated Employee is FORBIDDEN from editing project (Returns false)", async () => {
      const allowed = await canUserEditProject(mockProject, unrelatedId, "SALES");
      expect(allowed).toBe(false);
    });

    it("Multiple Product Owners: All designated owners in productOwners have edit permissions", async () => {
      const po2Id = "66f123456789abcdef123477";
      const multiPoProject = {
        ...mockProject,
        productOwners: [poId, po2Id],
      };

      const po1Allowed = await canUserEditProject(multiPoProject, poId, "EMPLOYEE");
      const po2Allowed = await canUserEditProject(multiPoProject, po2Id, "EMPLOYEE");
      const unrelatedAllowed = await canUserEditProject(multiPoProject, unrelatedId, "EMPLOYEE");

      expect(po1Allowed).toBe(true);
      expect(po2Allowed).toBe(true);
      expect(unrelatedAllowed).toBe(false);
    });
  });
});
