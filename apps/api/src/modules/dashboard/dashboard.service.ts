import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  defaultPeriodForType,
  getPeriodBounds,
  normalizePeriodType,
  type PeriodType,
} from './dashboard-period';

function addDaysIsoUtc(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + deltaDays * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}

type IdNameRow = { id: string; name: string };

type TaskInPeriodRow = {
  status: string;
  memberId: string | null;
  progressPercent: number;
  endDate: string;
  completionDate: string | null;
  projectId: string | null;
};

type UpcomingIncompleteRow = { endDate: string; projectId: string | null };

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /** Same as schedule / web: unfinished work past end date (progress under 100%). */
  private isCurrentlyDelayedTask(
    task: { progressPercent: number; endDate: string },
    todayIso: string
  ): boolean {
    const p = Number(task.progressPercent);
    if (!Number.isFinite(p) || p >= 100) return false;
    return todayIso > task.endDate;
  }

  async getSummary(periodTypeRaw?: string, periodRaw?: string) {
    let type: PeriodType;
    try {
      type = normalizePeriodType(periodTypeRaw);
    } catch {
      throw new BadRequestException('periodType must be week, month, quarter, or year');
    }

    const resolvedPeriod =
      periodRaw != null && String(periodRaw).trim() !== ''
        ? String(periodRaw).trim()
        : defaultPeriodForType(type);

    let bounds: { start: string; end: string };
    try {
      bounds = getPeriodBounds(type, resolvedPeriod);
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }

    const today = new Date().toISOString().slice(0, 10);

    const upcomingEnd = addDaysIsoUtc(today, 13);

    const [totalMembers, totalProjects, tasksInPeriod, members, projects, upcomingIncomplete] =
      (await Promise.all([
        this.prisma.member.count(),
        this.prisma.project.count(),
        this.prisma.task.findMany({
          where: { endDate: { gte: bounds.start, lte: bounds.end } },
          select: {
            status: true,
            memberId: true,
            progressPercent: true,
            endDate: true,
            completionDate: true,
            projectId: true,
          },
        }),
        this.prisma.member.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.project.findMany({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
        this.prisma.task.findMany({
          where: {
            endDate: { gte: today, lte: upcomingEnd },
            status: { not: 'DONE' },
          },
          select: { endDate: true, projectId: true },
        }),
      ])) as [
        number,
        number,
        TaskInPeriodRow[],
        IdNameRow[],
        IdNameRow[],
        UpcomingIncompleteRow[],
      ];

    const projectNameById = new Map(projects.map((p) => [p.id, p.name]));

    const totalTasks = tasksInPeriod.length;

    const taskStatusDistribution = { todo: 0, inProgress: 0, done: 0 };
    let delayedTasksInPeriod = 0;
    let completedTasksInPeriod = 0;
    const delayedByMember = new Map<string, number>();
    const doneByMember = new Map<string, number>();
    type HealthBucket = { done: number; inProgress: number; delayed: number };
    const healthByProjectKey = new Map<string, HealthBucket>();
    const getHealth = (key: string): HealthBucket => {
      let h = healthByProjectKey.get(key);
      if (!h) {
        h = { done: 0, inProgress: 0, delayed: 0 };
        healthByProjectKey.set(key, h);
      }
      return h;
    };

    for (const m of members) {
      delayedByMember.set(m.id, 0);
      doneByMember.set(m.id, 0);
    }

    for (const t of tasksInPeriod) {
      if (t.status === 'DONE') {
        taskStatusDistribution.done++;
      } else if (t.status === 'IN_PROGRESS') {
        taskStatusDistribution.inProgress++;
      } else {
        taskStatusDistribution.todo++;
      }

      if (t.status === 'DONE' && t.completionDate) {
        completedTasksInPeriod++;
      }
      if (t.progressPercent < 100 && today > t.endDate) {
        delayedTasksInPeriod++;
      }

      if (t.memberId && t.status === 'DONE') {
        const dCur = doneByMember.get(t.memberId);
        if (dCur !== undefined) {
          doneByMember.set(t.memberId, dCur + 1);
        }
      }

      if (t.memberId && this.isCurrentlyDelayedTask(t, today)) {
        const cur = delayedByMember.get(t.memberId);
        if (cur !== undefined) {
          delayedByMember.set(t.memberId, cur + 1);
        }
      }

      const pKey = t.projectId ?? '__none__';
      const h = getHealth(pKey);
      if (t.status === 'DONE') {
        h.done++;
      } else if (this.isCurrentlyDelayedTask(t, today)) {
        h.delayed++;
      } else {
        h.inProgress++;
      }
    }

    const projectHealthRows: {
      projectId: string;
      projectName: string;
      doneCount: number;
      inProgressCount: number;
      delayedCount: number;
    }[] = [];

    for (const [key, h] of healthByProjectKey) {
      const total = h.done + h.inProgress + h.delayed;
      if (total === 0) continue;
      const projectId = key === '__none__' ? '' : key;
      const projectName =
        key === '__none__'
          ? 'No project'
          : (projectNameById.get(key) ?? 'Unknown project');
      projectHealthRows.push({
        projectId,
        projectName,
        doneCount: h.done,
        inProgressCount: h.inProgress,
        delayedCount: h.delayed,
      });
    }

    projectHealthRows.sort((a, b) => {
      if (b.delayedCount !== a.delayedCount) return b.delayedCount - a.delayedCount;
      const ta = a.doneCount + a.inProgressCount + a.delayedCount;
      const tb = b.doneCount + b.inProgressCount + b.delayedCount;
      if (tb !== ta) return tb - ta;
      return a.projectName.localeCompare(b.projectName);
    });

    const dateKeys: string[] = [];
    const countsByDateAndProject = new Map<string, Map<string, number>>();
    for (let i = 0; i < 14; i++) {
      const d = addDaysIsoUtc(today, i);
      dateKeys.push(d);
      countsByDateAndProject.set(d, new Map());
    }

    const projectKeysInUpcoming = new Set<string>();
    for (const u of upcomingIncomplete) {
      const m = countsByDateAndProject.get(u.endDate);
      if (!m) continue;
      const pKey = u.projectId ?? '__none__';
      projectKeysInUpcoming.add(pKey);
      m.set(pKey, (m.get(pKey) ?? 0) + 1);
    }

    const sortedUpcomingProjectKeys = Array.from(projectKeysInUpcoming).sort((a, b) => {
      if (a === '__none__') return 1;
      if (b === '__none__') return -1;
      const na = projectNameById.get(a) ?? a;
      const nb = projectNameById.get(b) ?? b;
      return na.localeCompare(nb);
    });

    const upcomingDueByDay = dateKeys.map((date) => {
      const m = countsByDateAndProject.get(date)!;
      let count = 0;
      const byProject = sortedUpcomingProjectKeys.map((projectKey) => {
        const c = m.get(projectKey) ?? 0;
        count += c;
        return {
          projectId: projectKey === '__none__' ? '' : projectKey,
          projectName:
            projectKey === '__none__' ? 'No project' : (projectNameById.get(projectKey) ?? 'Unknown project'),
          count: c,
        };
      });
      return { date, count, byProject };
    });

    const memberWorkloadRanking = members.map((m) => ({
      memberId: m.id,
      memberName: m.name,
      doneTaskCount: doneByMember.get(m.id) ?? 0,
      delayedTaskCount: delayedByMember.get(m.id) ?? 0,
    }));

    return {
      periodType: type,
      period: resolvedPeriod,
      totalMembers,
      totalProjects,
      totalTasks,
      delayedTasksInPeriod,
      completedTasksInPeriod,
      taskStatusDistribution,
      memberWorkloadRanking,
      projectHealthByProject: projectHealthRows,
      upcomingDueByDay,
    };
  }
}
