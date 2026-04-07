import { Injectable, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { stringify } from 'csv-stringify/sync';

const reportTaskInclude = {
  member: { select: { name: true } },
  project: { select: { name: true } },
  subProject: { select: { name: true } },
} as const;

type ReportTaskRow = Prisma.TaskGetPayload<{
  include: typeof reportTaskInclude;
}>;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateWeeklyCsv(week: string): Promise<string> {
    const { start, end } = this.parseIsoWeek(week);
    return this.generateCsv(start, end);
  }

  async generateMonthlyCsv(month: string): Promise<string> {
    const { start, end } = this.parseMonth(month);
    return this.generateCsv(start, end);
  }

  private async generateCsv(startRange: string, endRange: string): Promise<string> {
    const tasks = await this.prisma.task.findMany({
      where: { endDate: { gte: startRange, lte: endRange } },
      include: reportTaskInclude,
    });

    const today = new Date().toISOString().slice(0, 10);

    const rows = tasks.map((t: ReportTaskRow) => {
      const durationDays = this.diffDays(t.startDate, t.endDate);
      let delayDays = 0;
      let isDelayed = false;

      if (t.status === 'DONE' && t.completionDate) {
        delayDays = Math.max(0, this.diffDays(t.endDate, t.completionDate));
        isDelayed = delayDays > 0;
      } else if (t.status !== 'DONE' && today > t.endDate) {
        delayDays = this.diffDays(t.endDate, today);
        isDelayed = true;
      }

      return {
        title: t.title,
        memberName: t.member?.name ?? '',
        projectName: t.project?.name ?? '',
        subProjectName: t.subProject?.name ?? '',
        startDate: t.startDate,
        endDate: t.endDate,
        durationDays,
        progressPercent: t.progressPercent,
        status: t.status,
        completionDate: t.completionDate ?? '',
        comments: t.comments ?? '',
        priority: t.priority,
        delayDays,
        isDelayed: String(isDelayed),
      };
    });

    return stringify(rows, { header: true });
  }

  private diffDays(from: string, to: string): number {
    const a = new Date(from);
    const b = new Date(to);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  private parseIsoWeek(week: string): { start: string; end: string } {
    const match = week.match(/^(\d{4})-W(\d{2})$/);
    if (!match) throw new BadRequestException('Invalid week format');
    const year = parseInt(match[1]);
    const weekNum = parseInt(match[2]);
    const jan4 = new Date(year, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    };
  }

  private parseMonth(month: string): { start: string; end: string } {
    const match = month.match(/^(\d{4})-(\d{2})$/);
    if (!match) throw new BadRequestException('Invalid month format');
    const year = parseInt(match[1]);
    const mon = parseInt(match[2]);
    const start = `${year}-${String(mon).padStart(2, '0')}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const end = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
}
