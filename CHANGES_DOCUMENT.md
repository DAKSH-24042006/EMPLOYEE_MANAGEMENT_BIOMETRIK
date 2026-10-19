# Biometrik Requirement Dashboard

## Comprehensive Change Specification & Comparison Document

**Document Version:** 1.0  
**Generated Date:** October 19, 2026  
**Baseline Archive:**
`C:\Users\daksh\Downloads\requirement-dashboard-deployment.zip`  
**Target Repository:** `d:\employee_management_system`

---

## 1. Executive Summary

This document provides an exhaustive, module-by-module audit of all changes made
between the baseline deployment archive (`requirement-dashboard-deployment.zip`)
and the current active codebase (`d:\employee_management_system`).

The changes modernize the system into an enterprise-grade project and bug
management platform, introducing:

1. **A unified 3-tier dashboard navigation hierarchy** (Overview, Personal
   Dashboard, Personal Projects).
2. **A full-featured Bug Tracking & Bug History lifecycle**, complete with audit
   logs, QA verification actions, centered layered modals, and automated PDF
   reporting.
3. **Canonical 4-stage project lifecycle standardization** and removal of legacy
   delivery progress bars.
4. **Flexible project scheduling** with optional finish dates (`endDate`).
5. **Strict Role-Based Access Control (RBAC)** restricting critical
   specification updates and QA Lead assignments strictly to System Admins and
   Project Managers.
6. **Responsive UI bug fixes**, notably resolving the calendar viewport cut-off
   and client-side Mongoose bundling errors.
7. **Comprehensive automated test coverage** (68 Jest tests across 5 test
   suites) and database migration scripts.

---

## 2. High-Level Comparison Matrix

| Capability / Area                  | Baseline (`requirement-dashboard-deployment.zip`)              | Current Codebase (`d:\employee_management_system`)                                                                                             |
| :--------------------------------- | :------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard Navigation**           | Flat, single overview page                                     | **3-tier navigation**: Overview (`/dashboard`), Personal Dashboard (`/dashboard/personal`), Personal Projects (`/dashboard/personal-projects`) |
| **Personal Work Item Tracking**    | None (users only saw global or project-specific lists)         | Dedicated **Personal Dashboard** displaying all assigned tasks, work items, and bugs with real-time deadline urgency indicators                |
| **Project Pinning / Favorites**    | Static / non-functional                                        | **Personal Projects page** with interactive searchable project selector, pinned storage in user profile, and direct workspace links            |
| **Bug Tracking & Lifecycle**       | Minimal placeholder schema                                     | **Enterprise Bug Management**: Auto-generated sequential IDs (`BUG-1`, etc.), severity, reproduction steps, QA pass/fail workflows             |
| **Bug History & Modal View**       | Non-existent                                                   | **Organization-wide Bug History page** with 85–90% centered layered modal, left-aligned Severity, Date Assigned, and sorting                   |
| **Bug PDF Export**                 | None                                                           | **Automated PDF report generation** via `jspdf` / `jspdf-autotable`, labeled as "Bug Report" (all "Dossier" labels removed)                    |
| **Project Lifecycles**             | Ad-hoc statuses (`Planning`, `In Progress`, `Completed`, etc.) | **4 Canonical Lifecycles**: `In Progress`, `On Hold (Backlogged)`, `In Testing`, `Live / Deployed`                                             |
| **Project Progress Bars**          | Progress % bar displayed on cards and overview                 | **Removed project delivery progress bars** from project lists, cards, and overview headers                                                     |
| **Project End Dates**              | Mandatory `timeline.endDate`                                   | **Optional Finish Date** (`Date                                                                                                                | null`) across database schemas, APIs, and forms |
| **Edit Specifications Permission** | Unrestricted / any viewer or member could trigger              | Strictly restricted to **System Admin** and that project's **Project Manager (`techOwner`)**                                                   |
| **Designated QA Lead Assignment**  | Any user could change QA Lead                                  | Strictly restricted to **System Admin** and that project's **Project Manager**                                                                 |
| **Calendar Grid View**             | Fixed height with `overflow: hidden`, causing cut-off          | Dynamic `min-height: 105px` cells, responsive multi-line padded legend, no vertical clipping                                                   |
| **Admin Email Settings**           | Basic SMTP config                                              | **Master Bug Notification switch**, customizable triggers, placeholder guidance, and recipient rules                                           |
| **Automated Testing**              | 1 basic test file (`auth.test.ts`)                             | **5 full test suites (68 automated unit/integration tests)** covering RBAC, APIs, closure preconditions, and pinning                           |

---

## 3. Detailed Architectural & Functional Changes

### Module 1: Dashboard Navigation & Layout

- **Files Modified:** `src/components/MainLayout.tsx`
- **Architectural Enhancements:**
  - Expanded the top/sidebar navigation under the "Dashboard" entry into three
    distinct views:
    - **Overview:** Organization-level project metrics and global health
      (`/dashboard`).
    - **Personal Dashboard:** Session-scoped assigned work items, tasks, and
      bugs (`/dashboard/personal`).
    - **Personal Projects:** Quick access to pinned and favorite projects
      (`/dashboard/personal-projects`).
  - Corrected raw unescaped character entities (`&copy;` and `&reg;`) in the
    application footer for consistent HTML rendering.

---

### Module 2: Personal Dashboard (`/dashboard/personal`)

- **Files Added:**
  - `src/app/dashboard/personal/page.tsx`
  - `src/app/api/user/personal-work/route.ts`
- **Features Implemented:**
  - **Session-Scoped Aggregation:** Securely extracts the user's ID from the JWT
    token and fetches all work items, tasks, and bugs where `assignee` matches
    the user.
  - **Deadline Urgency Badges:** Dynamically computes time to deadline and
    displays color-coded badges:
    - `Overdue` (Red badge)
    - `Due Today` (Amber badge)
    - `Due in X days` (Blue / Gray badge)
  - **Tabbed & Filterable Views:** Switch easily between "My Tasks", "My Work
    Items", and "My Assigned Bugs".

---

### Module 3: Personal Projects & Pinning (`/dashboard/personal-projects`)

- **Files Added:**
  - `src/app/dashboard/personal-projects/page.tsx`
  - `src/app/api/personal-projects/route.ts`
  - `src/app/api/personal-projects/eligible/route.ts`
  - `src/lib/models/PersonalProject.ts`
  - `src/lib/projectMembership.ts`
- **Files Modified:**
  - `src/lib/models/User.ts` (added
    `pinnedProjects?: mongoose.Types.ObjectId[]`)
  - `src/app/api/user/pinned-projects/route.ts`
- **Features Implemented:**
  - **Eligible Project Filtering:** Users can only pin projects they are
    authorized members of (Tech Owner, QA Lead, Task Assignee, or System Admin).
  - **Interactive Searchable Modal:** Pin and unpin projects on demand without
    leaving the dashboard.
  - **Direct Workspace Navigation:** Quick cards linking straight to project
    workspaces and active sprint boards.

---

### Module 4: Bug Tracking & Organization Bug History

- **Files Added:**
  - `src/lib/models/Bug.ts` & `src/lib/models/Counter.ts`
  - `src/app/bug-history/page.tsx`
  - `src/components/project/ProjectBugTrackingTab.tsx`
  - `src/components/ui/JiraIcons.tsx`
  - `src/lib/bugPdfGenerator.ts`
  - `src/app/api/bugs/history/route.ts`
  - `src/app/api/projects/[id]/bugs/route.ts`
  - `src/app/api/projects/[id]/bugs/[bugId]/route.ts`
  - `src/app/api/projects/[id]/bugs/[bugId]/action/route.ts`
- **Features Implemented:**
  - **Atomic Counter & Readable IDs:** Sequential IDs formatted as `BUG-1`,
    `BUG-2`, etc.
  - **Comprehensive Bug Schema:** Tracks severity (`Critical`, `Major`, `Minor`,
    `Low`), status (`Open`, `In Progress`, `Resolved`, `Closed`), steps to
    reproduce, expected/actual behavior, attachments, audit logs, and assignees.
  - **QA Verification Workflow:** Integrated `QA_PASS`, `QA_FAIL`, and `FIX`
    transitions with audit trails.
  - **Centered Layered Modal:** Bug details and history open in an accessible
    85–90% width/height centered overlay with background backdrop.
  - **Clean PDF Reports:** Generates professional client-side PDF exports titled
    **"Bug Report"** (zero occurrences of "Dossier").

---

### Module 5: Project Lifecycle Standardization & Progress Removal

- **Files Modified:**
  - `src/lib/constants.ts`
  - `src/app/projects/page.tsx`
  - `src/app/dashboard/page.tsx`
  - `src/app/projects/[id]/page.tsx`
  - `src/app/projects/new/page.tsx`
- **Features Implemented:**
  - **Canonical 4 Lifecycles:** Standardized across all pages and database
    records to:
    1. `In Progress`
    2. `On Hold (Backlogged)`
    3. `In Testing`
    4. `Live / Deployed`
  - **Status Normalization:** Added `normalizeProjectStatus()` in
    `src/lib/constants.ts` to seamlessly convert legacy statuses (`Planning`,
    `Active`, `Completed`, `Archived`) to the canonical set.
  - **Removed Delivery Progress Bars:** Removed arbitrary percentage bars from
    project list cards and detail headers, replacing them with accurate
    task/work-item breakdown metrics.
  - **Client-Side Stability:** Moved enum constants out of Mongoose model files
    into `constants.ts` to prevent webpack client bundle failures
    (`Cannot read properties of undefined (reading 'Project')`).

---

### Module 6: Optional Finish Date Architecture

- **Files Modified:**
  - `src/lib/models/Project.ts` (updated `timeline.endDate` to optional
    `Date | null`)
  - `src/app/projects/new/page.tsx`
  - `src/app/projects/[id]/page.tsx`
  - `src/app/api/projects/create/route.ts`
  - `src/app/api/projects/[id]/route.ts`
- **Features Implemented:**
  - Finish date is no longer mandatory during project creation or specification
    editing.
  - Graceful fallback: Displays `"Not set"` or `"Ongoing"` in UI tables, cards,
    and headers when `endDate` is absent.

---

### Module 7: Security & Role-Based Access Control (RBAC) Hardening

- **Files Modified:**
  - `src/app/projects/[id]/page.tsx`
  - `src/app/api/projects/[id]/route.ts`
  - `src/lib/projectAccess.ts`
  - `src/app/api/projects/[id]/tasks/[taskId]/route.ts`
  - `src/app/api/projects/[id]/tasks/route.ts`
  - `src/app/api/projects/[id]/work-items/[itemId]/route.ts`
  - `src/app/api/projects/[id]/work-items/route.ts`
  - `src/app/api/projects/[id]/blockers/[blockerId]/route.ts`
  - `src/app/api/projects/[id]/attachments/route.ts`
  - `src/app/api/projects/[id]/attachments/[attachmentId]/route.ts`
- **Enforcement Rules:**
  1. **Edit Specifications:**
     - UI: The "Edit Specifications" button is visible and active **strictly for
       System Admins and the project's Project Manager (`techOwner`)**.
     - API: Updating `title`, `description`, or `timeline` (start/end dates)
       validates session role and ownership. Unauthorized callers receive
       **`403 Forbidden`**.
  2. **Designated QA Lead Assignment:**
     - UI: The QA Lead selector dropdown is disabled for general members and
       developers.
     - API: Updating `qaLead` is strictly restricted to **System Admin and
       Project Manager** (403 Forbidden for others).
  3. **Non-Member Guarding:**
     - Users not assigned to a project cannot create or alter tasks, work items,
       blockers, or attachments.
     - Members can only update items assigned to them unless they are the
       Project Manager or System Admin.
  4. **Closure Preconditions:**
     - Moving a project to `Live / Deployed` enforces resolution of all
       critical/major blockers and unclosed bugs.

---

### Module 8: Calendar Interface & UX Overhaul

- **Files Modified:** `src/app/calendar/page.tsx`
- **Fixes Applied:**
  - **No Content Cut-off:** Removed restrictive fixed container heights
    (`height: 100%`) and `overflow: hidden`.
  - **Dynamic Day Cell Height:** Day cells now have `min-height: 105px` with
    automatic vertical expansion.
  - **Bottom Legend Padded:** Added generous multi-row flex wrapping and bottom
    padding to the event category legend (`Project Delivery`,
    `Sprint Milestones`, `Task Deadlines`, `Bug Resolution`).

---

### Module 9: Admin Email Settings & Notification Dispatch Engine

- **Files Added / Modified:**
  - `src/lib/models/EmailConfig.ts`
  - `src/app/api/admin/email-settings/route.ts`
  - `src/components/admin/EmailSettingsPanel.tsx`
  - `src/lib/mailer.ts`
- **Features Implemented:**
  - **Master Bug Notification Switch:** Admin toggle (`enabled: boolean`) to
    turn all automated bug emails on or off globally.
  - **Trigger Rules:** Configurable notification dispatches for `BUG_REPORTED`,
    `STATUS_CHANGED`, `SEVERITY_CHANGED`, and `ASSIGNED`.
  - **Recipient Enforcement:** Notification dispatches strictly target the
    Assignee, Reporter, QA Lead, and Project Manager based on active rules.

---

### Module 10: Automated Testing & Migration Tooling

- **Files Added:**
  - `tests/api/rbac_permissions.test.ts`
  - `tests/api/api_routes_authorization.test.ts`
  - `tests/api/personal_projects.test.ts`
  - `tests/api/project_closure_preconditions.test.ts`
  - `scripts/migrate_lifecycle.js`
  - `scripts/migrate_personal_projects.js`
- **Coverage Summary:**
  - 5 test suites containing **68 automated tests** passing 100%.
  - Fully verifies authorization boundaries, session isolation, closure
    validation, and data normalization.

---

## 4. Complete File Inventory

### Newly Added Files (Not present in deployment zip)

1. `src/app/api/bugs/history/route.ts`
2. `src/app/api/personal-projects/eligible/route.ts`
3. `src/app/api/personal-projects/route.ts`
4. `src/app/api/projects/[id]/bugs/[bugId]/action/route.ts`
5. `src/app/api/projects/[id]/bugs/[bugId]/route.ts`
6. `src/app/api/projects/[id]/bugs/route.ts`
7. `src/app/api/user/personal-work/route.ts`
8. `src/app/bug-history/page.tsx`
9. `src/app/dashboard/personal-projects/page.tsx`
10. `src/app/dashboard/personal/page.tsx`
11. `src/components/project/ProjectBugTrackingTab.tsx`
12. `src/components/ui/JiraIcons.tsx`
13. `src/lib/bugPdfGenerator.ts`
14. `src/lib/models/Bug.ts`
15. `src/lib/models/Counter.ts`
16. `src/lib/models/PersonalProject.ts`
17. `src/lib/projectMembership.ts`
18. `src/types/images.d.ts`
19. `scripts/migrate_lifecycle.js`
20. `scripts/migrate_personal_projects.js`
21. `tests/api/api_routes_authorization.test.ts`
22. `tests/api/personal_projects.test.ts`
23. `tests/api/project_closure_preconditions.test.ts`
24. `tests/api/rbac_permissions.test.ts`

### Modified Existing Files

1. `src/app/api/admin/email-settings/route.ts`
2. `src/app/api/projects/[id]/attachments/[attachmentId]/route.ts`
3. `src/app/api/projects/[id]/attachments/bulk-download/route.ts`
4. `src/app/api/projects/[id]/attachments/route.ts`
5. `src/app/api/projects/[id]/blockers/[blockerId]/route.ts`
6. `src/app/api/projects/[id]/route.ts`
7. `src/app/api/projects/[id]/tasks/[taskId]/route.ts`
8. `src/app/api/projects/[id]/tasks/route.ts`
9. `src/app/api/projects/[id]/test-cases/[testId]/route.ts`
10. `src/app/api/projects/[id]/work-items/[itemId]/route.ts`
11. `src/app/api/projects/[id]/work-items/route.ts`
12. `src/app/api/projects/create/route.ts`
13. `src/app/api/user/pinned-projects/route.ts`
14. `src/app/calendar/page.tsx`
15. `src/app/dashboard/page.tsx`
16. `src/app/globals.css`
17. `src/app/projects/[id]/page.tsx`
18. `src/app/projects/new/page.tsx`
19. `src/app/projects/page.tsx`
20. `src/components/MainLayout.tsx`
21. `src/components/admin/EmailSettingsPanel.tsx`
22. `src/lib/constants.ts`
23. `src/lib/mailer.ts`
24. `src/lib/models/EmailConfig.ts`
25. `src/lib/models/Project.ts`
26. `src/lib/models/Task.ts`
27. `src/lib/models/User.ts`
28. `src/lib/models/WorkItem.ts`
29. `src/lib/projectAccess.ts`
30. `tsconfig.json`

---

## 5. Build, Verification & Production Readiness

- **TypeScript Compilation:** Passed with 0 errors (`npx tsc --noEmit`).
- **Unit & Integration Tests:** 68/68 passed across all suites (`npm test`).
- **Production Build:** Next.js production build (`npm run build`) succeeded
  without client bundle exceptions.
- **Backward Compatibility:** All existing projects automatically normalize to
  canonical lifecycle states through `constants.ts` and provided migration
  scripts.
