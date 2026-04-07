# Stack Decisions

## 1. Goal
This document locks the technical stack for phase 1 so implementation remains consistent during vibe coding.

## 2. Backend
- Framework: NestJS
- ORM: Prisma
- Database: SQLite
- API style: REST
- Language: TypeScript
- Response envelope: all JSON responses use `{ data, meta }` for success and `{ error, meta }` for errors

## 3. Frontend
- Framework: Ionic Angular
- Language: TypeScript
- UI goal: simple, practical, local-first MVP

## 4. Data Grid
- Library: AG Grid Community
- Use case: spreadsheet-like task scheduling with filtering and inline editing

## 5. Charts
- Library: Chart.js
- Angular wrapper: ng2-charts
- Use case: Dashboard summary charts (task status doughnut, member workload bar)

## 6. Export Format
- Phase 1 default: CSV
- CSV generation library: `csv-stringify` (lightweight, no extra dependencies)
- XLSX is optional for a later phase

## 7. Baseline Architecture
- Frontend calls backend REST API
- Backend uses Prisma to access SQLite
- Dashboard summaries and CSV exports compute delay fields from task records (`delayDays` / `isDelayed` per DATA_MODEL)

## 8. Locked MVP Decisions
- No authentication in phase 1
- No pagination in phase 1 unless clearly needed
- No realtime updates
- No notifications
- No attachments
- No soft delete in phase 1
- One task has one member, one project, and one sub project

## 9. Folder Structure
- docs/
- .cursor/rules/
- apps/api/         (NestJS backend)
- apps/web/         (Ionic Angular frontend)
- Monorepo strategy: plain npm workspaces — no nx or turborepo; keep it simple

## 10. Local Dev Setup
- Backend default port: `3000` (`http://localhost:3000/api`)
- Frontend default port: `8100` (`http://localhost:8100`)
- Start backend: `npm run start:dev` inside `apps/api/`
- Start frontend: `ionic serve` inside `apps/web/`
- Database file: `apps/api/dev.db` (SQLite, local only)

## 11. Frontend UI Decisions

### Navigation
- Layout: `ion-split-pane` with a persistent left side menu on desktop/tablet; hamburger menu on mobile
- Routes:
  - `/dashboard`
  - `/members`
  - `/projects`
  - `/assignments`
  - `/schedule`
  - `/reports`

### Chart Types (Chart.js / ng2-charts)
- Dashboard: **doughnut** task status (TODO / IN_PROGRESS / DONE); **horizontal bar** member workload with segment (On-time = DONE count per member, Delay = delayed count per member; delay rule: progress under 100% and today past `endDate`)

### AG Grid Schedule Table
| Column | Type | Editable |
|---|---|---|
| `title` | text | ✅ |
| `member` | select (from assignments) | ✅ |
| `project` | select | ✅ |
| `subProject` | select (filtered by project) | ✅ |
| `startDate` | date | ✅ |
| `endDate` | date | ✅ |
| `completionDate` | date (enabled only when status = DONE) | ✅ |
| `progressPercent` | number 0–100 | ✅ |
| `status` | select (TODO / IN_PROGRESS / DONE) | ✅ |
| `priority` | select (LOW / MEDIUM / HIGH) | ✅ |
| `comments` | text | ✅ |
| `durationDays` | computed display | ❌ read-only |
| `isDelayed` | computed badge | ❌ read-only |

## 12. Revisit Conditions
Only change these decisions if:
- the MVP cannot be completed with this stack
- a dependency creates a blocking issue
- the product scope changes explicitly