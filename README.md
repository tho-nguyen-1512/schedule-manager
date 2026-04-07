# Member Management — Internal Dashboard (MVP)

A **local-first** monorepo: **NestJS + Prisma + SQLite** backend and **Ionic Angular** frontend with **AG Grid Community** (task schedule) and **Chart.js / ng2-charts** (Dashboard). Data and APIs run on your machine; no cloud dependency is required.

Detailed specifications live under `docs/`:

| Document | Contents |
|----------|----------|
| [docs/PRD.md](docs/PRD.md) | Product scope, screens, functional requirements |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | Data model, field rules (tasks, delay, …) |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | REST API, `{ data, meta }` / `{ error, meta }` envelopes |
| [docs/STACK_DECISIONS.md](docs/STACK_DECISIONS.md) | Locked stack, dev ports, folder layout |

---

## Features (MVP)

- **Members:** CRUD; unique names (case-insensitive).
- **Projects:** CRUD for projects and **sub projects** (children of a project).
- **Assignments:** link members to projects / sub projects.
- **Schedule:** task CRUD and inline grid editing; filters by member, project, week/month, status; month timeline (Gantt-style) above the grid.
- **Reports:** **CSV** export by week / month (includes delay columns per the data model).
- **Dashboard:** period summaries (week / month / quarter / year), task status charts, member workload, project health, upcoming due tasks.

Each **task** belongs to exactly one member, one project, and one sub project. If a task is assigned to a project that has **no** sub projects yet, the backend **auto-creates** a sub project with the same name as the project and assigns it to the task.

**Task rules (summary):**

- `startDate` and `endDate` are required; `durationDays` is **computed at read time** and is not stored.
- `status`: `TODO` | `IN_PROGRESS` | `DONE`.
- When `status = DONE`, `completionDate` is **required**; otherwise `completionDate` must be null.
- Delay fields (`delayDays`, `isDelayed`) are consistent across CSV, schedule, and Dashboard (includes late DONE tasks and incomplete tasks past `endDate`).

**Out of scope for MVP:** authentication / authorization, realtime, notifications, file attachments, soft delete (by default), pagination (unless clearly needed), XLSX/PDF export.

---

## Repository layout

```
member-management-project/
├── apps/
│   ├── api/          # NestJS + Prisma, SQLite
│   └── web/          # Ionic Angular (Angular 20)
├── docs/             # PRD, data model, API contract, stack
└── package.json      # npm workspaces (apps/*)
```

---

## Run locally (step by step)

Follow these steps **in order** after cloning. All commands assume a terminal open at the **repository root** (the folder that contains `package.json` and `apps/`). On Windows, use **PowerShell** or **Git Bash** the same way.

### 0. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Git** | To clone the repository. |
| **Node.js** | **20.x LTS** recommended (or **18.19+**). [nodejs.org](https://nodejs.org/) |
| **npm** | Comes with Node.js. |

**Check that Node and npm are installed:**

```bash
node -v    # should print v18.x or v20.x (or newer LTS)
npm -v     # should print a version number
```

You do **not** need to install SQLite separately. The database is a single file on disk, managed by Prisma.

**Optional:** [Ionic CLI](https://ionicframework.com/docs/cli) only if you prefer `ionic serve` instead of `npm start` for the frontend (`npm install -g @ionic/cli`).

---

### 1. Clone and enter the project

```bash
git clone <repository-url> member-management-project
cd member-management-project
```

Replace `<repository-url>` with your Git remote. If you already have the folder, only run `cd` into it.

---

### 2. Install all dependencies (once per clone)

From the **repository root**:

```bash
npm install
```

**What this does:** npm workspaces install packages for the root, `apps/api`, and `apps/web` in one go. It can take a few minutes. The API package runs **`prisma generate`** on install (`postinstall`), which generates the typed Prisma Client under `node_modules`. If that step is skipped or fails, the backend may not compile.

**Success:** the command finishes without errors; `node_modules` folders appear under the root and under each app.

---

### 3. Configure the backend database URL

The API needs a **`.env`** file next to the Nest app (not committed to Git).

**Easiest way** — copy the example file:

```bash
cp apps/api/.env.example apps/api/.env
```

On Windows (PowerShell):

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

**Manual way** — create `apps/api/.env` with a single line (same content as [apps/api/.env.example](apps/api/.env.example)):

```env
DATABASE_URL="file:../dev.db"
```

That creates the SQLite file at **`apps/api/dev.db`** after migrations. The `*.db` file is gitignored.

---

### 4. Create the database (migrations)

Still from the **repository root**:

```bash
cd apps/api
npx prisma migrate deploy
cd ../..
```

**What this does:** applies existing SQL migrations and creates/updates `dev.db`.

**Success:** you see Prisma reporting applied migrations; no error about `DATABASE_URL` or missing `.env`.

**If you change the Prisma schema yourself** (not needed for a first run), use `npx prisma migrate dev` instead of `migrate deploy`, and optionally `npx prisma generate`.

---

### 5. Start the backend (keep this terminal open)

Open **terminal 1**. From the **repository root**:

```bash
cd apps/api
npm run start:dev
```

**Success:** logs show Nest is listening; no crash on startup.

**Defaults:**

- URL base: **`http://localhost:3000`**
- API routes are under **`/api`** (e.g. `http://localhost:3000/api/health`)

Leave this terminal running.

---

### 6. Start the frontend (second terminal)

Open **terminal 2**. From the **repository root**:

```bash
cd apps/web
npm start
```

**What this does:** runs Angular’s dev server (`ng serve`).

**Success:** the terminal prints a **Local** URL. Open it in your browser (often **`http://localhost:4200`**). If port 4200 is busy, Angular picks another port — **always use the URL from your terminal**.

**Optional:** if you use Ionic CLI:

```bash
cd apps/web
ionic serve
```

Ionic often uses **`http://localhost:8100`**; again, follow the printed URL.

Leave this terminal running too.

---

### 7. How the UI talks to the API (local dev)

For local development, the web app is configured to call the API at **`http://localhost:3000/api`** (see `apps/web/src/environments/environment.ts`, `apiUrl`).

**Important:**

1. Start the **backend** (step 5) before or at least when you use features that load data.
2. Keep **both** processes running while you work.

Production builds use `environment.prod.ts` with `apiUrl: '/api'` (same-origin / reverse proxy). You only need the `localhost:3000` setup for local `npm start`.

---

### 8. Verify that everything works

1. **Backend:** in a browser or with curl:  
   `http://localhost:3000/api/health`  
   You should see JSON like `{ "status": "ok" }`.
2. **Frontend:** open the Local URL from step 6; navigate to **Dashboard** or **Members** and try creating a row, then refresh — data should persist.
3. If the UI shows network errors, confirm terminal 1 is still running and nothing else is using port **3000**.

---

### Common issues

| Problem | What to try |
|--------|-------------|
| `Cannot find module` / install errors | Delete `node_modules` in root, `apps/api`, and `apps/web`, then run `npm install` again from the **repository root**. |
| Prisma errors about `DATABASE_URL` | Ensure `apps/api/.env` exists and contains `DATABASE_URL=...` (copy from `.env.example`). |
| TypeScript errors mentioning `PrismaClientKnownRequestError` or many implicit `any` / Prisma types | From `apps/api`, run `npx prisma generate` (or run `npm install` again from the repo root so `postinstall` runs). |
| Port **3000** already in use | Stop the other app, or change the port in `apps/api/src/main.ts` and set `apiUrl` in `environment.ts` to match. |
| Blank data / failed requests | Backend not running, wrong `apiUrl`, or browser blocking — check DevTools **Network** tab. |

---

## Useful scripts

### `apps/api`

| Command | Description |
|---------|-------------|
| `npm run start:dev` | NestJS watch mode |
| `npm run build` | Production build |
| `npm run start:prod` | Run `dist/main` after build |
| `npm test` | Jest |
| `npm run lint` | ESLint |

### `apps/web`

| Command | Description |
|---------|-------------|
| `npm start` / `ng serve` | Dev server |
| `npm run build` | Production build |
| `npm test` | Karma / Jasmine |
| `npm run lint` | ESLint |

---

## Tech stack (summary)

- **Backend:** NestJS, Prisma, SQLite, `csv-stringify` (CSV export), class-validator.
- **Frontend:** Angular 20, Ionic 8, AG Grid Community, Chart.js, ng2-charts, RxJS.
- **Monorepo:** plain npm workspaces (no Nx/Turborepo per stack decision).

---

## Extra manual checks (optional)

After the checks in **step 8** above: open **Schedule**, edit a cell and save; open **Reports** and export a week/month CSV to confirm downloads.

---

## Notes

- This is an **internal MVP** without an advanced security model; do not expose it publicly without authentication and hardening.
- Align API and data behavior changes with `docs/API_CONTRACT.md` and `docs/DATA_MODEL.md` before changing code.
