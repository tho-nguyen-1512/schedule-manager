# Product Requirements Document (MVP)

## 1. Overview
A local web dashboard for teams to manage:
- Members
- Projects
- Member-project assignments
- Task schedules
- Weekly/monthly report exports
- Dashboard summaries (counts, charts)

This is an internal MVP focused on usability and fast implementation.

## 2. Product Goal
Deliver a practical local-first dashboard that enables a team lead/admin to:
1. Maintain members, projects, and assignments
2. Track tasks in a spreadsheet-like schedule table
3. Export weekly and monthly task reports
4. View task overview on the Dashboard (status mix, member workload, project health, upcoming due)

## 3. Target Users
- Team lead
- Internal admin
- Manager tracking team delivery

## 4. In Scope (MVP)
- Member CRUD (Create, Read, Update, Delete)
- Project CRUD
- Member-to-project assignment management
- Task CRUD with required fields:
  - Project
  - Sub project
  - Task title
  - Assignee (member)
  - Progress (0-100 %)
  - Start date
  - End date
  - Duration (days)
  - Status (`TODO` | `IN_PROGRESS` | `DONE`)
  - Completion date (required when status = `DONE`)
  - Comments
  - Priority (`LOW` | `MEDIUM` | `HIGH`)
- Schedule table for inline task edits
- Task filtering by member, project, week, month, status
- Weekly report export (CSV)
- Monthly report export (CSV)

## 5. Out of Scope (MVP)
- Authentication and role-based authorization
- XLSX/PDF export (CSV only for MVP)

## 6. Main Screens
1. Dashboard
   - Period controls (default: Month + current month): Week / Month / Quarter / Year and a dependent period value (e.g. ISO week, month name, quarter, year). Summary cards and charts use tasks whose `endDate` falls in the selected period.
   - Total member count (global)
   - Total project count (global)
   - Total task count (in selected period)
   - Delayed task count (in selected period; same delay rule as schedule)
   - Completed task count (tasks with `status = DONE` and `completionDate` set, among tasks whose `endDate` falls in the selected period)
   - Task status distribution (doughnut: TODO / IN_PROGRESS / DONE, total in center; cohort = selected period)
   - Member workload (horizontal bar: segment On-time = DONE tasks per member; segment Delay = delayed tasks per member; cohort = selected period)
   - Project health overview (stacked vertical bar per project: Done / On-track / Delayed; cohort = selected period; delayed rule matches schedule)
   - Upcoming due tasks (stacked bar by due date for the next 7 or 14 days; segments colored by project; incomplete tasks only; not tied to the period filter)
2. Members
3. Projects
4. Assignments
5. Schedule (Task Timeline month view above the task grid and its filter row)
6. Reports

## 7. Functional Requirements

### 7.1 Members
- Add, edit, delete, and list members
- Prevent duplicate member names (case-insensitive) in MVP

### 7.2 Projects
- Add, edit, delete, and list projects/sub projects (sub projects are children of the project)

### 7.3 Assignments
- Assign one member to multiple projects/sub projects
- Assign multiple members to one project/sub project
- Remove assignments
- Show assignment matrix/list

### 7.4 Task Schedule
- Create, edit, and delete tasks
- Inline editing in a table/grid
- **Task Timeline** (month Gantt): shown above the task grid and its filter row. Optional multi-select members and projects (empty = all), pick month; shows tasks spanning that month with done/delayed coloring (same delay rule as the grid delay column). Independent of the grid filter row.
- Validation:
  - Start date is required
  - End date is required
  - Assignee and project/sub project are required
- Status is set by the user; the system does not auto-derive status from progress or dates in MVP
- Filtering by member, project, sub project, status, week, month

### 7.5 Reports
- Export weekly CSV from filtered/selected week data
- Export monthly CSV from filtered/selected month data
- Include at minimum:
  - Task title
  - Assignee
  - Project
  - Sub project
  - Start date
  - End date
  - Duration
  - Progress
  - Status
  - Completion date
  - Comments
  - Priority
  - Delay days
  - Is delayed (boolean)

## 8. Non-Functional Requirements
- Currently runs locally on a single machine
- Data stored locally (no cloud dependency required for MVP)
- Basic input validation and error states
- Exported CSV opens in common spreadsheet tools

## 9. Acceptance Criteria (Testable)

### 9.1 Members
- [x] User can create a member with required fields; new member appears in list immediately
- [x] User can edit a member and changes persist after page reload
- [x] User can delete a member with confirmation; member no longer appears in list
- [x] Duplicate member names are rejected with a clear validation message

### 9.2 Projects
- [x] User can create/edit/delete projects from the Projects screen
- [x] User can create/edit/delete sub projects (children of the project) from the Projects screen
- [x] If a Project without sub projects is assigned to a task, automatically create a sub project with the same name as the project and assign it to the task
### 9.3 Assignments
- [x] User can assign at least one member to a project
- [x] User can remove an assignment
- [x] Assignment changes are reflected in Schedule task forms/filters

### 9.4 Tasks / Schedule
- [x] User can create/edit a task with title, member, project, sub project, start date, end date, duration, progress, status, comments, priority
- [x] User can delete a task and it is removed from table and report/dashboard source data
- [x] Filters (member/project/week/month/status) return correct subset of tasks
- [x] Backend rejects task create/update with missing required fields; frontend may show a warning indicator before submit but does not bypass server validation

### 9.5 Reports
- [x] Weekly export generates a CSV file containing only tasks in selected week
- [x] Monthly export generates a CSV file containing only tasks in selected month
- [x] CSV headers match required fields and row count matches filtered task count

## 10. Constraints
- Keep implementation simple and maintainable
- Prioritize delivery speed over architecture complexity
- Reuse common, practical technologies familiar to the team
- No advanced auth/security model in MVP

## 11. Open Questions (Must Resolve Before Build)
1. Member required fields: name only, or name + role? -> Name, (core project that the member is responsible for) is required (optional: sub-projects that the member is responsible for, role, day of birth, email, phone, start date)
2. Should deleted members/projects be hard-deleted or soft-deleted in MVP? -> Resolved: hard delete in MVP for simplicity
3. Timezone rule for due/completion date comparison (local timezone default?) -> local timezone is OK
4. Should overdue incomplete tasks contribute delay days in exports, or only delayed flag/count? -> Resolved: CSV includes both `delayDays` (computed) and `isDelayed` (boolean flag)
5. Confirm CSV as the only export format for MVP -> CSV is OK