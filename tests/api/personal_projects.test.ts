/**
 * @jest-environment node
 */
import { Role } from "@/lib/constants";

// Mock database connection
jest.mock("@/lib/db", () => jest.fn().mockResolvedValue(true));

// Mock authentication helper
let currentMockAuth: { userId: string; role: string } | null = null;
jest.mock("@/lib/apiAuth", () => ({
  requireAuth: jest.fn(async () => {
    if (!currentMockAuth) {
      const { NextResponse } = require("next/server");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return currentMockAuth;
  }),
}));

// In-memory mock store for users, projects, and personal projects
const mockUsers: Record<string, any> = {};
const mockProjects: Record<string, any> = {};
let mockPersonalProjects: any[] = [];

jest.mock("@/lib/models/User", () => ({
  User: {
    findById: jest.fn(async (id: any) => mockUsers[String(id)] || null),
  },
}));

jest.mock("@/lib/models/Project", () => ({
  Project: {
    findById: jest.fn(async (id: any) => mockProjects[String(id)] || null),
    find: jest.fn((query: any) => {
      let results = Object.values(mockProjects);
      if (query?._id?.$nin) {
        const ninSet = new Set(query._id.$nin.map(String));
        results = results.filter((p) => !ninSet.has(String(p._id)));
      }
      if (query?.$or) {
        results = results.filter((p) => {
          return query.$or.some((cond: any) => {
            if (cond.techOwner && String(p.techOwner) === String(cond.techOwner)) return true;
            if (cond.productOwner && String(p.productOwner) === String(cond.productOwner))
              return true;
            if (cond.qaLead && String(p.qaLead) === String(cond.qaLead)) return true;
            if (
              cond.techTeamMembers &&
              Array.isArray(p.techTeamMembers) &&
              p.techTeamMembers.some((m: any) => String(m) === String(cond.techTeamMembers))
            )
              return true;
            return false;
          });
        });
      }
      return {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(results),
      };
    }),
  },
}));

jest.mock("@/lib/models/PersonalProject", () => ({
  PersonalProject: {
    find: jest.fn((filter: any) => {
      const filtered = mockPersonalProjects.filter((p) => String(p.user) === String(filter.user));
      return {
        populate: jest.fn().mockImplementation(() => ({
          sort: jest.fn().mockResolvedValue(
            filtered.map((item) => {
              const project = mockProjects[String(item.project)] || null;
              return {
                _id: item._id,
                user: item.user,
                project,
                createdAt: item.createdAt,
              };
            })
          ),
        })),
        select: jest.fn().mockResolvedValue(
          filtered.map((item) => ({
            project: item.project,
          }))
        ),
      };
    }),
    findOne: jest.fn(async (filter: any) => {
      return (
        mockPersonalProjects.find(
          (p) =>
            String(p.user) === String(filter.user) && String(p.project) === String(filter.project)
        ) || null
      );
    }),
    create: jest.fn(async (data: any) => {
      const record = {
        _id: "pp_" + Math.random().toString(36).substring(7),
        user: data.user,
        project: data.project,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPersonalProjects.push(record);
      return record;
    }),
    findByIdAndDelete: jest.fn(async (id: any) => {
      const idx = mockPersonalProjects.findIndex((p) => String(p._id) === String(id));
      if (idx !== -1) {
        const removed = mockPersonalProjects.splice(idx, 1);
        return removed[0];
      }
      return null;
    }),
    deleteMany: jest.fn(async (filter: any) => {
      const ids = new Set((filter?._id?.$in || []).map(String));
      const before = mockPersonalProjects.length;
      mockPersonalProjects = mockPersonalProjects.filter(
        (p) => !(ids.has(String(p._id)) && String(p.user) === String(filter.user))
      );
      return { deletedCount: before - mockPersonalProjects.length };
    }),
    findOneAndDelete: jest.fn(async (filter: any) => {
      const idx = mockPersonalProjects.findIndex(
        (p) =>
          String(p.user) === String(filter.user) && String(p.project) === String(filter.project)
      );
      if (idx !== -1) {
        const removed = mockPersonalProjects.splice(idx, 1);
        return removed[0];
      }
      return null;
    }),
  },
}));

import {
  GET as getPersonalProjects,
  POST as pinPersonalProject,
  DELETE as deletePersonalProject,
} from "@/app/api/personal-projects/route";
import { GET as getEligibleProjects } from "@/app/api/personal-projects/eligible/route";

describe("Personal Projects and Project Membership Test Suite (13 Scenarios)", () => {
  const pmUserId = "66f123456789abcdef000001";
  const devUserId = "66f123456789abcdef000002";
  const qaUserId = "66f123456789abcdef000003";
  const poUserId = "66f123456789abcdef000004";
  const ordinaryEmpId = "66f123456789abcdef000005";
  const ordinaryAdminId = "66f123456789abcdef000006";
  const sysAdminId = "66f123456789abcdef000007";

  const targetProjectId = "66f123456789abcdef111111";
  const unrelatedProjectId = "66f123456789abcdef222222";

  beforeEach(() => {
    mockPersonalProjects = [];

    // Seed users
    mockUsers[pmUserId] = { _id: pmUserId, name: "Alice PM", role: Role.TECH_MANAGER };
    mockUsers[devUserId] = { _id: devUserId, name: "Bob Dev", role: Role.EMPLOYEE };
    mockUsers[qaUserId] = { _id: qaUserId, name: "Charlie QA", role: Role.EMPLOYEE };
    mockUsers[poUserId] = { _id: poUserId, name: "Diana PO", role: Role.EMPLOYEE };
    mockUsers[ordinaryEmpId] = { _id: ordinaryEmpId, name: "Evan Employee", role: Role.EMPLOYEE };
    mockUsers[ordinaryAdminId] = { _id: ordinaryAdminId, name: "Frank Admin", role: Role.ADMIN };
    mockUsers[sysAdminId] = { _id: sysAdminId, name: "Grace SysAdmin", role: Role.SYSTEM_ADMIN };

    // Seed target project
    mockProjects[targetProjectId] = {
      _id: targetProjectId,
      title: "Core Platform Project",
      status: "Active",
      techOwner: pmUserId,
      productOwner: poUserId,
      qaLead: qaUserId,
      techTeamMembers: [devUserId],
      clientDetails: { companyName: "Acme Corp" },
    };

    // Seed unrelated project
    mockProjects[unrelatedProjectId] = {
      _id: unrelatedProjectId,
      title: "Unrelated Project",
      status: "Active",
      techOwner: "other_pm",
      productOwner: "other_po",
      qaLead: "other_qa",
      techTeamMembers: ["other_dev"],
      clientDetails: { companyName: "Other Corp" },
    };
  });

  // Scenario 1: A developer can pin a project they belong to
  it("Scenario 1: A developer can pin a project they belong to", async () => {
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: targetProjectId }),
    });

    const res = await pinPersonalProject(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.message).toContain("successfully added");
  });

  // Scenario 2: A QA member can pin a project they belong to
  it("Scenario 2: A QA member can pin a project they belong to", async () => {
    currentMockAuth = { userId: qaUserId, role: Role.EMPLOYEE };
    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: targetProjectId }),
    });

    const res = await pinPersonalProject(req);
    expect(res.status).toBe(201);
  });

  // Scenario 3: A Product Owner can pin a project they belong to
  it("Scenario 3: A Product Owner can pin a project they belong to", async () => {
    currentMockAuth = { userId: poUserId, role: Role.EMPLOYEE };
    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: targetProjectId }),
    });

    const res = await pinPersonalProject(req);
    expect(res.status).toBe(201);
  });

  // Scenario 4: A project manager can pin a project they manage
  it("Scenario 4: A project manager can pin a project they manage", async () => {
    currentMockAuth = { userId: pmUserId, role: Role.TECH_MANAGER };
    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: targetProjectId }),
    });

    const res = await pinPersonalProject(req);
    expect(res.status).toBe(201);
  });

  // Scenario 5: An ordinary employee cannot pin an unrelated project by manipulating the API request
  it("Scenario 5: An ordinary employee cannot pin an unrelated project (403 Forbidden)", async () => {
    currentMockAuth = { userId: ordinaryEmpId, role: Role.EMPLOYEE };
    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: targetProjectId }),
    });

    const res = await pinPersonalProject(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Forbidden");
  });

  // Scenario 6: An ordinary Admin cannot use the System Admin exception
  it("Scenario 6: An ordinary Admin (ADMIN) cannot use the System Admin exception", async () => {
    currentMockAuth = { userId: ordinaryAdminId, role: Role.ADMIN };
    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: targetProjectId }),
    });

    const res = await pinPersonalProject(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("Forbidden");
  });

  // Scenario 7: A System Admin can pin any existing project
  it("Scenario 7: A System Admin (SYSTEM_ADMIN) can pin any existing project without being a member", async () => {
    currentMockAuth = { userId: sysAdminId, role: Role.SYSTEM_ADMIN };
    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: unrelatedProjectId }),
    });

    const res = await pinPersonalProject(req);
    expect(res.status).toBe(201);
  });

  // Scenario 8: A System Admin pin does not modify project membership or assignments
  it("Scenario 8: System Admin pin does not modify project membership or assignments", async () => {
    currentMockAuth = { userId: sysAdminId, role: Role.SYSTEM_ADMIN };
    const initialProjectState = JSON.stringify(mockProjects[unrelatedProjectId]);

    const req = new Request("http://localhost/api/personal-projects", {
      method: "POST",
      body: JSON.stringify({ projectId: unrelatedProjectId }),
    });
    await pinPersonalProject(req);

    // Verify project document is unchanged
    expect(JSON.stringify(mockProjects[unrelatedProjectId])).toBe(initialProjectState);
    expect(mockProjects[unrelatedProjectId].techOwner).toBe("other_pm");
    expect(mockProjects[unrelatedProjectId].techTeamMembers).not.toContain(sysAdminId);
  });

  // Scenario 9: Users cannot read, add, or remove another user's pins
  it("Scenario 9: Users cannot read, add, or remove another user's pins (scoped to session)", async () => {
    // Dev pins target project
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId }),
      })
    );

    // QA queries personal projects -> does NOT see Dev's pinned project
    currentMockAuth = { userId: qaUserId, role: Role.EMPLOYEE };
    const qaRes = await getPersonalProjects();
    const qaJson = await qaRes.json();
    expect(qaJson.data.length).toBe(0);

    // QA cannot delete Dev's pin
    const delRes = await deletePersonalProject(
      new Request(`http://localhost/api/personal-projects?projectId=${targetProjectId}`, {
        method: "DELETE",
      })
    );
    expect(delRes.status).toBe(404);
  });

  // Scenario 10: Pinned projects persist across refreshes and sessions
  it("Scenario 10: Pinned projects persist across queries and sessions", async () => {
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId }),
      })
    );

    // Reload / second query
    const res = await getPersonalProjects();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.length).toBe(1);
    expect(json.data[0]._id).toBe(targetProjectId);
    expect(json.data[0].title).toBe("Core Platform Project");
    // Ensure no progress bars field exposed
    expect(json.data[0].progressPercent).toBeUndefined();
  });

  // Scenario 11: Removing a pin does not delete or modify the underlying project
  it("Scenario 11: Removing a pin does not delete or modify the underlying project", async () => {
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId }),
      })
    );

    const delRes = await deletePersonalProject(
      new Request(`http://localhost/api/personal-projects?projectId=${targetProjectId}`, {
        method: "DELETE",
      })
    );
    expect(delRes.status).toBe(200);

    // Project still exists
    expect(mockProjects[targetProjectId]).toBeDefined();
    expect(mockProjects[targetProjectId].title).toBe("Core Platform Project");
  });

  // Scenario 12: Revoked project membership does not leave an ordinary employee with unauthorized access through a stale pin
  it("Scenario 12: Revoked project membership cleans up stale pin and denies access", async () => {
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    // 1. Dev initially pins project they belong to
    await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId }),
      })
    );
    expect(mockPersonalProjects.length).toBe(1);

    // 2. Dev's membership is revoked (removed from techTeamMembers)
    mockProjects[targetProjectId].techTeamMembers = [];

    // 3. Dev fetches personal projects -> stale pin is purged, returns empty list
    const res = await getPersonalProjects();
    const json = await res.json();
    expect(json.data.length).toBe(0);
    expect(mockPersonalProjects.length).toBe(0);

    // 4. Dev cannot re-pin the project
    const rePinRes = await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId }),
      })
    );
    expect(rePinRes.status).toBe(403);
  });

  // Scenario 13: Pinned-projects route and personal projects API integrity
  it("Scenario 13: Pinned-projects route and personal projects API integrity", () => {
    const fs = require("fs");
    const path = require("path");
    const root = path.resolve(__dirname, "../..");

    // Pinned projects route is verified
    expect(fs.existsSync(path.join(root, "src/app/api/user/pinned-projects/route.ts"))).toBe(true);

    // Overview dashboard no longer calls the legacy endpoint
    const dashboard = fs.readFileSync(path.join(root, "src/app/dashboard/page.tsx"), "utf8");
    expect(dashboard).not.toContain("pinned-projects");
    expect(dashboard).not.toContain("pinnedProjects");
  });

  it("Eligible selector filters out already pinned projects and respects membership scope", async () => {
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    const eligibleRes = await getEligibleProjects();
    const eligibleJson = await eligibleRes.json();

    // Dev can only see projects where they are assigned (targetProjectId), not unrelatedProjectId
    const eligibleIds = eligibleJson.data.map((p: any) => p._id);
    expect(eligibleIds).toContain(targetProjectId);
    expect(eligibleIds).not.toContain(unrelatedProjectId);

    // Once pinned, it is removed from eligible list
    await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId }),
      })
    );

    const eligibleAfterPin = await getEligibleProjects();
    const jsonAfter = await eligibleAfterPin.json();
    const afterIds = jsonAfter.data.map((p: any) => p._id);
    expect(afterIds).not.toContain(targetProjectId);
  });

  it("System Admin selector lists all projects, ordinary Admin selector lists none", async () => {
    currentMockAuth = { userId: sysAdminId, role: Role.SYSTEM_ADMIN };
    const sysJson = await (await getEligibleProjects()).json();
    const sysIds = sysJson.data.map((p: any) => p._id);
    expect(sysIds).toEqual(expect.arrayContaining([targetProjectId, unrelatedProjectId]));

    currentMockAuth = { userId: ordinaryAdminId, role: Role.ADMIN };
    const adminJson = await (await getEligibleProjects()).json();
    expect(adminJson.data.length).toBe(0);
  });

  it("Ignores a role supplied in the request body (role comes from trusted DB user)", async () => {
    currentMockAuth = { userId: ordinaryEmpId, role: Role.EMPLOYEE };
    const res = await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId, role: "SYSTEM_ADMIN" }),
      })
    );
    expect(res.status).toBe(403);
  });

  it("Rejects duplicate pins, invalid ids, missing projects and unauthenticated calls", async () => {
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    const post = (body: any) =>
      pinPersonalProject(
        new Request("http://localhost/api/personal-projects", {
          method: "POST",
          body: JSON.stringify(body),
        })
      );

    expect((await post({ projectId: targetProjectId })).status).toBe(201);
    expect((await post({ projectId: targetProjectId })).status).toBe(409);
    expect((await post({ projectId: "not-an-id" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect((await post({ projectId: "66f123456789abcdef999999" })).status).toBe(404);

    currentMockAuth = null;
    expect((await post({ projectId: targetProjectId })).status).toBe(401);
  });

  it("Deleted projects are purged from a user's personal projects", async () => {
    currentMockAuth = { userId: devUserId, role: Role.EMPLOYEE };
    await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: targetProjectId }),
      })
    );
    delete mockProjects[targetProjectId];

    const json = await (await getPersonalProjects()).json();
    expect(json.data.length).toBe(0);
    expect(mockPersonalProjects.length).toBe(0);
  });

  it("System Admin pins are retained without membership and project stays unchanged", async () => {
    currentMockAuth = { userId: sysAdminId, role: Role.SYSTEM_ADMIN };
    await pinPersonalProject(
      new Request("http://localhost/api/personal-projects", {
        method: "POST",
        body: JSON.stringify({ projectId: unrelatedProjectId }),
      })
    );
    const json = await (await getPersonalProjects()).json();
    expect(json.data.length).toBe(1);
    expect(mockProjects[unrelatedProjectId].techTeamMembers).toEqual(["other_dev"]);
  });
});
