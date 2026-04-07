import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import type { Task } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private computeDurationDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
  }

  private formatTask(task: any) {
    return {
      ...task,
      durationDays: this.computeDurationDays(task.startDate, task.endDate),
    };
  }

  async findAll(query: {
    memberId?: string;
    projectId?: string;
    subProjectId?: string;
    status?: string;
    week?: string;
    month?: string;
  }) {
    const where: any = {};
    if (query.memberId) where.memberId = query.memberId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.subProjectId) where.subProjectId = query.subProjectId;
    if (query.status) where.status = query.status;

    if (query.week) {
      const { start, end } = this.parseIsoWeek(query.week);
      where.endDate = { gte: start, lte: end };
    } else if (query.month) {
      const { start, end } = this.parseMonth(query.month);
      where.endDate = { gte: start, lte: end };
    }

    const tasks = await this.prisma.task.findMany({ where });
    return { items: tasks.map((t: Task) => this.formatTask(t)) };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return this.formatTask(task);
  }

  async create(dto: CreateTaskDto) {
    this.validateCompletionDate(dto.status, dto.completionDate);

    const subProjectId = await this.resolveSubProjectId(
      dto.projectId,
      dto.subProjectId,
    );

    const task = await this.prisma.task.create({
      data: {
        ...dto,
        subProjectId,
        completionDate: dto.completionDate ?? null,
      },
    });
    return this.formatTask(task);
  }

  async update(id: string, dto: UpdateTaskDto) {
    const existing = await this.findOne(id);

    const status = dto.status ?? existing.status;
    const completionDate =
      dto.completionDate !== undefined
        ? dto.completionDate
        : existing.completionDate;

    this.validateCompletionDate(status, completionDate);

    let subProjectId = dto.subProjectId;
    if (dto.projectId && dto.projectId !== existing.projectId) {
      subProjectId = await this.resolveSubProjectId(
        dto.projectId,
        dto.subProjectId,
      );
    }

    const data: any = { ...dto };
    if (subProjectId) data.subProjectId = subProjectId;

    const task = await this.prisma.task.update({
      where: { id },
      data,
    });
    return this.formatTask(task);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.task.delete({ where: { id } });
  }

  private validateCompletionDate(
    status: string,
    completionDate?: string | null,
  ) {
    if (status === 'DONE' && !completionDate) {
      throw new BadRequestException(
        'completionDate is required when status is DONE',
      );
    }
    if (status !== 'DONE' && completionDate) {
      throw new BadRequestException(
        'completionDate must be null when status is not DONE',
      );
    }
  }

  /**
   * If no subProjectId is provided, check if the project has sub projects.
   * If not, auto-create one with the same name as the project.
   */
  private async resolveSubProjectId(
    projectId: string,
    subProjectId?: string,
  ): Promise<string> {
    if (subProjectId) return subProjectId;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { subProjects: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (project.subProjects.length > 0) {
      return project.subProjects[0].id;
    }

    const autoSub = await this.prisma.subProject.create({
      data: { name: project.name, parentProjectId: projectId },
    });
    return autoSub.id;
  }

  private parseIsoWeek(week: string): { start: string; end: string } {
    const match = week.match(/^(\d{4})-W(\d{2})$/);
    if (!match) throw new BadRequestException('Invalid week format, use YYYY-WNN');
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
    if (!match) throw new BadRequestException('Invalid month format, use YYYY-MM');
    const year = parseInt(match[1]);
    const mon = parseInt(match[2]);
    const start = `${year}-${String(mon).padStart(2, '0')}-01`;
    const lastDay = new Date(year, mon, 0).getDate();
    const end = `${year}-${String(mon).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { start, end };
  }
}
