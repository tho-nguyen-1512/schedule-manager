-- Align database with current Prisma schema (Project extras, Member join table, nullable FKs).
-- Old init migration predates these changes; without this, inserts fail (e.g. Project.email).

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "document" TEXT;
ALTER TABLE "Project" ADD COLUMN "email" TEXT;
ALTER TABLE "Project" ADD COLUMN "resource" TEXT;

-- RedefineTables (foreign_keys off so Member can be recreated without cascading away MemberCoreProject rows)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "MemberCoreProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "MemberCoreProject_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberCoreProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "MemberCoreProject" ("id", "memberId", "projectId")
SELECT
  'mcp_' || lower(hex(randomblob(8))) || lower(hex(randomblob(8))),
  "id",
  "coreProjectId"
FROM "Member"
WHERE "coreProjectId" IS NOT NULL;

CREATE TABLE "new_Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT,
    "projectId" TEXT,
    "subProjectId" TEXT,
    CONSTRAINT "Assignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Assignment_subProjectId_fkey" FOREIGN KEY ("subProjectId") REFERENCES "SubProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Assignment" ("id", "memberId", "projectId", "subProjectId") SELECT "id", "memberId", "projectId", "subProjectId" FROM "Assignment";
DROP TABLE "Assignment";
ALTER TABLE "new_Assignment" RENAME TO "Assignment";
CREATE UNIQUE INDEX "Assignment_memberId_projectId_subProjectId_key" ON "Assignment"("memberId", "projectId", "subProjectId");

CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "dateOfBirth" TEXT,
    "phone" TEXT,
    "startDate" TEXT
);
INSERT INTO "new_Member" ("dateOfBirth", "email", "id", "name", "phone", "role", "startDate") SELECT "dateOfBirth", "email", "id", "name", "phone", "role", "startDate" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_name_key" ON "Member"("name");

CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "memberId" TEXT,
    "projectId" TEXT,
    "subProjectId" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "completionDate" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "comments" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    CONSTRAINT "Task_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_subProjectId_fkey" FOREIGN KEY ("subProjectId") REFERENCES "SubProject" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Task" ("comments", "completionDate", "endDate", "id", "memberId", "priority", "progressPercent", "projectId", "startDate", "status", "subProjectId", "title") SELECT "comments", "completionDate", "endDate", "id", "memberId", "priority", "progressPercent", "projectId", "startDate", "status", "subProjectId", "title" FROM "Task";
DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";
CREATE INDEX "Task_memberId_idx" ON "Task"("memberId");
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX "Task_endDate_idx" ON "Task"("endDate");
CREATE INDEX "Task_status_idx" ON "Task"("status");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE UNIQUE INDEX "MemberCoreProject_memberId_projectId_key" ON "MemberCoreProject"("memberId", "projectId");
