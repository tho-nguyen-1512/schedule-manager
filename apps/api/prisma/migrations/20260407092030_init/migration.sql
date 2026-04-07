-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "coreProjectId" TEXT NOT NULL,
    "email" TEXT,
    "role" TEXT,
    "dateOfBirth" TEXT,
    "phone" TEXT,
    "startDate" TEXT,
    CONSTRAINT "Member_coreProjectId_fkey" FOREIGN KEY ("coreProjectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberSupportProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    CONSTRAINT "MemberSupportProject_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberSupportProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SubProject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentProjectId" TEXT NOT NULL,
    CONSTRAINT "SubProject_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subProjectId" TEXT NOT NULL,
    CONSTRAINT "Assignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Assignment_subProjectId_fkey" FOREIGN KEY ("subProjectId") REFERENCES "SubProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subProjectId" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "completionDate" TEXT,
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "comments" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    CONSTRAINT "Task_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Task_subProjectId_fkey" FOREIGN KEY ("subProjectId") REFERENCES "SubProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_name_key" ON "Member"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MemberSupportProject_memberId_projectId_key" ON "MemberSupportProject"("memberId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_memberId_projectId_subProjectId_key" ON "Assignment"("memberId", "projectId", "subProjectId");

-- CreateIndex
CREATE INDEX "Task_memberId_idx" ON "Task"("memberId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_endDate_idx" ON "Task"("endDate");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");
