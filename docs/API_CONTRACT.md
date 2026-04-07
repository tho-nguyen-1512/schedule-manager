# API Contract (MVP, Phase 1)

## Design Principles
1. Aligned with `docs/PRD.md` and `docs/DATA_MODEL.md`.
2. Endpoints are simple and NestJS-friendly (no auth, no pagination).
3. All JSON responses use the `{ data, meta }` / `{ error, meta }` envelope.
4. Only frontend-needed fields and filters are included.
5. All business rule decisions are resolved — see §6.

## 1. Base Conventions
- Base URL: `/api`
- Content type: `application/json` (except CSV export endpoints)
- No authentication/authorization in phase 1
- No pagination in phase 1 (expected dataset is small)
- Dates use local date string format: `YYYY-MM-DD`
- All mutating endpoints follow these response conventions:
  - `POST` → `201 Created` with the created object wrapped in `{ "data": {} }`
  - `PATCH` → `200 OK` with the updated object wrapped in `{ "data": {} }`
  - `DELETE` → `204 No Content` with empty body
- All entities are hard-deleted in MVP for simplicity

## 2. Standard Response Shape

### 2.1 Success (JSON)
```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

### 2.2 Error (JSON)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "projectId is required",
    "details": {
      "field": "projectId"
    }
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## 3. Domain Types

### Member
```json
{
  "id": "mem_001",
  "name": "Nguyen Van A",
  "coreProjectId": "proj_001",
  "supProjectIds": ["proj_002"],
  "email": "a@example.com",
  "role": "Developer",
  "dateOfBirth": "1997-01-10",
  "phone": "0900000000",
  "startDate": "2026-01-01"
}
```

### Project
```json
{
  "id": "proj_001",
  "name": "Core Platform"
}
```

### SubProject
```json
{
  "id": "sub_001",
  "name": "Auth Module",
  "parentProjectId": "proj_001"
}
```

### Assignment
```json
{
  "id": "asn_001",
  "memberId": "mem_001",
  "projectId": "proj_001",
  "subProjectId": "sub_001"
}
```

### Task
```json
{
  "id": "task_001",
  "title": "Implement member CRUD",
  "memberId": "mem_001",
  "projectId": "proj_001",
  "subProjectId": "sub_001",
  "startDate": "2026-04-01",
  "endDate": "2026-04-05",
  "completionDate": "2026-04-07",
  "durationDays": 4,
  "progressPercent": 100,
  "status": "DONE",
  "comments": "Blocked by API schema",
  "priority": "HIGH"
}
```

## 4. Endpoints

## 4.0 Dashboard

### GET `/api/dashboard`
- Returns summary stats for the Dashboard screen.
- **Query (optional):** `periodType` = `week` | `month` | `quarter` | `year` (default `month`). `period` = canonical value for that type; if omitted or invalid, the server uses the default period containing “today” for that type.
- **Period formats:** `week` → `YYYY-Www` (ISO week, e.g. `2026-W15`); `month` → `YYYY-MM`; `quarter` → `YYYY-Qn` with `n` in `1..4`; `year` → `YYYY`.
- **Cohort:** `totalTasks`, `taskStatusDistribution`, `delayedTasksInPeriod`, `completedTasksInPeriod`, `memberWorkloadRanking`, and `projectHealthByProject` include only tasks whose **`endDate`** (inclusive) falls between the period’s start and end dates. `totalMembers` and `totalProjects` are global counts.
- `projectHealthByProject`: one row per project (plus `No project` when `projectId` is null) that has at least one task in the cohort. `doneCount`: `status = DONE`. `delayedCount`: not done, `progressPercent` below 100, server `today` after `endDate`. `inProgressCount`: remaining tasks in the cohort (on-track work: TODO / IN_PROGRESS not delayed).
- `upcomingDueByDay`: 14 entries, dates `today` … `today + 13` (UTC calendar days from server `today`). `count`: tasks with that `endDate` and `status` ≠ `DONE` (ignores dashboard period). `byProject`: breakdown by `projectId` / `projectName` for that day; the same project list and order is repeated on every day (zeros where none due), covering all projects that appear in the 14-day upcoming window.
- `taskStatusDistribution`: counts by stored `status` (`TODO`, `IN_PROGRESS`, `DONE`; any other value is counted as TODO).
- `memberWorkloadRanking`: one row per member (order not guaranteed; client sorts for charts). `doneTaskCount`: `status = DONE` with `memberId` in the cohort. `delayedTaskCount`: `memberId` present, `progressPercent` below 100, and server `today` (UTC `YYYY-MM-DD` from `toISOString`) after `endDate`, in the cohort.
- `completedTasksInPeriod`: `status = DONE` with non-null `completionDate` in the cohort.
- Response echoes `periodType` and `period` (resolved canonical value).

Response `200`
```json
{
  "data": {
    "periodType": "month",
    "period": "2026-04",
    "totalMembers": 12,
    "totalProjects": 5,
    "totalTasks": 120,
    "delayedTasksInPeriod": 8,
    "completedTasksInPeriod": 42,
    "taskStatusDistribution": {
      "todo": 10,
      "inProgress": 25,
      "done": 85
    },
    "memberWorkloadRanking": [
      { "memberId": "m1", "memberName": "Alice", "doneTaskCount": 12, "delayedTaskCount": 3 },
      { "memberId": "m2", "memberName": "Bob", "doneTaskCount": 8, "delayedTaskCount": 0 }
    ],
    "projectHealthByProject": [
      {
        "projectId": "p1",
        "projectName": "Alpha",
        "doneCount": 10,
        "inProgressCount": 4,
        "delayedCount": 2
      }
    ],
    "upcomingDueByDay": [
      {
        "date": "2026-04-07",
        "count": 2,
        "byProject": [
          { "projectId": "p1", "projectName": "Alpha", "count": 1 },
          { "projectId": "p2", "projectName": "Beta", "count": 1 }
        ]
      },
      {
        "date": "2026-04-08",
        "count": 0,
        "byProject": [
          { "projectId": "p1", "projectName": "Alpha", "count": 0 },
          { "projectId": "p2", "projectName": "Beta", "count": 0 }
        ]
      }
    ]
  },
  "meta": { "requestId": "req_123" }
}
```

## 4.1 Members

### GET `/api/members`
- Returns full list for dropdown/table usage.

### GET `/api/members/:id`

Response `200`
```json
{
  "data": {
    "items": []
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

### POST `/api/members`
Request body:
```json
{
  "name": "Nguyen Van A",
  "coreProjectId": "proj_001",
  "supProjectIds": ["proj_002"],
  "email": "a@example.com",
  "role": "Developer",
  "dateOfBirth": "1997-01-10",
  "phone": "0900000000",
  "startDate": "2026-01-01"
}
```

### PATCH `/api/members/:id`
- Partial update.

### DELETE `/api/members/:id`
- Hard delete in MVP for simplicity.

## 4.2 Projects and Sub Projects

### GET `/api/projects`
- Returns projects with nested sub projects.

Response `200`
```json
{
  "data": {
    "items": [
      {
        "id": "proj_001",
        "name": "Core Platform",
        "subProjects": [
          {
            "id": "sub_001",
            "name": "Auth Module",
            "parentProjectId": "proj_001"
          }
        ]
      }
    ]
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

### POST `/api/projects`
Request body:
```json
{
  "name": "Core Platform"
}
```

### GET `/api/projects/:id`
- Returns the project with its nested sub projects.

### PATCH `/api/projects/:id`
### DELETE `/api/projects/:id`

### POST `/api/projects/:projectId/sub-projects`
Request body:
```json
{
  "name": "Auth Module"
}
```

### PATCH `/api/sub-projects/:id`
### DELETE `/api/sub-projects/:id`

## 4.3 Assignments

### GET `/api/assignments`
- Optional query params: `memberId`, `projectId`, `subProjectId`

### POST `/api/assignments`
Request body:
```json
{
  "memberId": "mem_001",
  "projectId": "proj_001",
  "subProjectId": "sub_001"
}
```

### DELETE `/api/assignments/:id`

## 4.4 Tasks

### GET `/api/tasks`
- Optional query params:
  - `memberId`
  - `projectId`
  - `subProjectId`
  - `status` (`TODO|IN_PROGRESS|DONE`)
  - `week` (ISO week string, example `2026-W14`)
  - `month` (`YYYY-MM`)

### POST `/api/tasks`
Request body:
```json
{
  "title": "Implement member CRUD",
  "memberId": "mem_001",
  "projectId": "proj_001",
  "subProjectId": "sub_001",
  "startDate": "2026-04-01",
  "endDate": "2026-04-05",
  "completionDate": null,
  "progressPercent": 0,
  "status": "TODO",
  "comments": "",
  "priority": "MEDIUM"
}
```

Rules:
- `title`, `startDate`, `endDate`, `memberId`, `projectId`, `subProjectId`, `status`, `priority`, `progressPercent` are required.
- `completionDate` is required when `status` = `DONE`; null otherwise.
- `durationDays` is derived by the backend from `startDate` and `endDate`; it is not accepted in request bodies.

### GET `/api/tasks/:id`

### PATCH `/api/tasks/:id`
- Partial update for inline editing.

### DELETE `/api/tasks/:id`

## 4.5 Reports (CSV)

### GET `/api/reports/weekly.csv?week=2026-W14`
### GET `/api/reports/monthly.csv?month=2026-04`

- Response content type: `text/csv`
- Columns:
  - `title`
  - `memberName`
  - `projectName`
  - `subProjectName`
  - `startDate`
  - `endDate`
  - `durationDays`
  - `progressPercent`
  - `status`
  - `comments`
  - `priority`
  - `completionDate`
  - `delayDays`
  - `isDelayed`

## 5. Validation Rules (MVP)
- `name` (member) must be unique case-insensitive.
- `progressPercent` must be between 0 and 100.
- `status` must be `TODO`, `IN_PROGRESS`, or `DONE`.
- `priority` must be `LOW`, `MEDIUM`, or `HIGH`.
- `startDate` and `endDate` must be valid local dates.
- Reject create/update when referenced IDs do not exist.

## 6. Business Rule Decisions (Resolved)
- Date semantics (resolved):
  - `endDate` = planned due date; delay threshold for incomplete tasks
  - `completionDate` = actual done date; used in `delay_days = max(0, completionDate - endDate)` for DONE tasks
  - Overdue incomplete: `delay_days = today - endDate` when `status != DONE` and `today > endDate`
- Status (resolved): client sets status directly; backend validates enum value only; no auto-derivation in MVP.
- Sub-project auto-create on task create is mandatory (confirmed in PRD §9.2 and DATA_MODEL §5):
  - If `projectId` in a task create/update request references a project with no existing sub projects, the backend must auto-create a sub project with the same name as the project and assign `subProjectId` to that new sub project.
- Overdue incomplete task export (resolved): CSV includes both `delayDays` (computed integer) and `isDelayed` (boolean flag).