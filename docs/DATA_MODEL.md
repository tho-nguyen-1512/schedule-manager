# Data Model (MVP)

## 1. Design Goals
- Keep schema minimal and implementation-friendly
- Match `docs/PRD.md` scope only
- Avoid redundant or low-value fields in MVP

## 2. Core Entities

### Member
- id: string
- name: string (required, unique case-insensitive)
- coreProjectId: string (required, FK -> Project.id) (member mainly responsible for the project)
- supProjectIds: string[] (optional, FK -> Project.id) (member only support for the projects if needed)
  - Note: requires a Prisma join table (e.g. `MemberSupportProject { memberId, projectId }`) since SQLite does not support native array columns
- email: string? (optional)
- role: string? (optional)
- dateOfBirth: date? (optional)
- phone: string? (optional)
- startDate: date? (optional)

### Project
- id: string
- name: string (required)

### Sub Project
- id: string
- name: string (required)
- parentProjectId: string (required, FK -> Project.id)

### Assignment
- id: string
- memberId: string (required, FK -> Member.id)
- projectId: string (required, FK -> Project.id)
- subProjectId: string (required, FK -> Sub Project.id)

### Task
- id: string
- title: string (required)
- memberId: string (required, FK -> Member.id)
- projectId: string (required, FK -> Project.id)
- subProjectId: string (required, FK -> Sub Project.id)
- startDate: date (required)
- endDate: date (required; used as the planned due date for delay checks)
- completionDate: date? (required when status = DONE; used as actual completion date for delay calculation)
- durationDays: number? (derived from startDate/endDate; not persisted)
- progressPercent: number (required, 0..100)
- status: TODO | IN_PROGRESS | DONE (required)
- comments: string? (optional)
- priority: LOW | MEDIUM | HIGH (required)

## 3. Relationships
- One project can have many child projects (sub projects)
- One member can have many tasks
- One project/sub project can have many tasks
- One member can belong to many projects/sub projects through Assignment
- One project/sub project can have many members through Assignment
- `Member.coreProjectId` and `Member.supProjectIds` describe the member's primary responsibilities for display purposes only
- `Assignment` is the operational record used for task scheduling, filtering, and access to project/sub project dropdowns

## 4. Business Rules (Aligned with PRD)
- Each task belongs to exactly one member and one project/sub project
- Task filtering supports member, project, sub project, status, week, and month
- Dashboard aggregates (via `GET /api/dashboard`) expose task status mix and per-member done vs delayed counts; CSV exports include computed `delayDays` and `isDelayed` per row
- CSV export supports weekly and monthly report output

## 5. Business Rule Decisions (Resolved)
- Date model (resolved):
  - `endDate` = planned due date; used for delay threshold checks
  - `completionDate` = actual completion date; set when `status` changes to `DONE`; used in delay formula: `delay_days = max(0, completionDate - endDate)`
  - For overdue incomplete tasks: if `status != DONE` and `today > endDate`, treat as delayed with `delay_days = today - endDate`
- Dashboard “this month” metrics use tasks whose `endDate` falls in the current calendar month (see API contract for dashboard)
- Status auto-update rule:
  - Status is set by the user; the backend does not auto-derive status from progress or dates in MVP
- Sub project auto-create rule (resolved):
  - When a task is assigned to a project that has no sub projects, the backend auto-creates a sub project with the same name as the project and assigns it to the task
- Duration behavior (resolved):
  - `durationDays` is always derived from `startDate`/`endDate` at read time; it is not stored in the database
- Overdue incomplete tasks in export (resolved):
  - CSV includes both `delayDays` (computed integer) and `isDelayed` (boolean flag)
- Deletion behavior (resolved):
  - Hard delete for all entities in MVP for simplicity

## 6. Recommended Enums

### TaskStatus
- TODO
- IN_PROGRESS
- DONE

### TaskPriority
- LOW
- MEDIUM
- HIGH

## 7. Suggested Minimal Constraints / Indexes
- Unique index on `lower(Member.name)`
- Unique index on `Assignment(memberId, projectId, subProjectId)`
- Index on `Task.memberId`
- Index on `Task.projectId`
- Index on `Task.endDate`
- Index on `Task.status`