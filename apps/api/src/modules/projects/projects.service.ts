import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateSubProjectDto,
  UpdateSubProjectDto,
} from './projects.dto';

const projectFindInclude = { subProjects: true } as const;

type ProjectWithSubs = Prisma.ProjectGetPayload<{
  include: typeof projectFindInclude;
}>;

type ProjectIdName = { id: string; name: string };
type SubProjectIdName = { id: string; name: string };

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  private formatProject(project: any) {
    return {
      ...project,
      emails: this.parseJson(project.email),
      resources: this.parseJson(project.resource),
      documents: this.parseJson(project.document),
    };
  }

  private parseJson(val: string | null): string[] {
    if (!val) return [];
    try { return JSON.parse(val); } catch { return []; }
  }

  private toDbData(dto: CreateProjectDto | UpdateProjectDto) {
    const { emails, resources, documents, ...rest } = dto as any;
    const data: any = { ...rest };
    if (emails !== undefined) data.email = JSON.stringify(emails);
    if (resources !== undefined) data.resource = JSON.stringify(resources);
    if (documents !== undefined) data.document = JSON.stringify(documents);
    return data;
  }

  async findAll() {
    const projects = await this.prisma.project.findMany({
      include: projectFindInclude,
    });
    return {
      items: projects.map((p: ProjectWithSubs) => this.formatProject(p)),
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectFindInclude,
    });
    if (!project) throw new NotFoundException('Project not found');
    return this.formatProject(project);
  }

  async create(dto: CreateProjectDto) {
    await this.checkUniqueProjectName(dto.name);
    const created = await this.prisma.project.create({
      data: this.toDbData(dto),
      include: projectFindInclude,
    });
    return this.formatProject(created);
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOne(id);
    if (dto.name) await this.checkUniqueProjectName(dto.name, id);
    const updated = await this.prisma.project.update({
      where: { id },
      data: this.toDbData(dto),
      include: projectFindInclude,
    });
    return this.formatProject(updated);
  }

  async remove(id: string) {
    await this.findOne(id);

    const subIds = (
      await this.prisma.subProject.findMany({
        where: { parentProjectId: id },
        select: { id: true },
      })
    ).map((s: { id: string }) => s.id);

    if (subIds.length > 0) {
      await this.prisma.task.updateMany({
        where: { subProjectId: { in: subIds } },
        data: { subProjectId: null },
      });
      await this.prisma.assignment.updateMany({
        where: { subProjectId: { in: subIds } },
        data: { subProjectId: null },
      });
    }

    await this.prisma.task.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    });
    await this.prisma.assignment.updateMany({
      where: { projectId: id },
      data: { projectId: null },
    });

    await this.prisma.project.delete({ where: { id } });
  }

  // --- Sub Projects ---

  async createSubProject(projectId: string, dto: CreateSubProjectDto) {
    await this.findOne(projectId);
    await this.checkUniqueSubProjectName(projectId, dto.name);
    return this.prisma.subProject.create({
      data: { ...dto, parentProjectId: projectId },
    });
  }

  async updateSubProject(id: string, dto: UpdateSubProjectDto) {
    const sub = await this.prisma.subProject.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('SubProject not found');
    if (dto.name) {
      await this.checkUniqueSubProjectName(sub.parentProjectId, dto.name, id);
    }
    return this.prisma.subProject.update({ where: { id }, data: dto });
  }

  async removeSubProject(id: string) {
    const sub = await this.prisma.subProject.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('SubProject not found');

    await this.prisma.task.updateMany({
      where: { subProjectId: id },
      data: { subProjectId: null },
    });
    await this.prisma.assignment.updateMany({
      where: { subProjectId: id },
      data: { subProjectId: null },
    });

    await this.prisma.subProject.delete({ where: { id } });
  }

  private async checkUniqueProjectName(name: string, excludeId?: string) {
    const all = await this.prisma.project.findMany({
      select: { id: true, name: true },
    });
    const lower = name.toLowerCase();
    const conflict = all.find(
      (p: ProjectIdName) =>
        p.name.toLowerCase() === lower && p.id !== excludeId,
    );
    if (conflict) {
      throw new ConflictException('Project name already exists');
    }
  }

  private async checkUniqueSubProjectName(
    parentProjectId: string,
    name: string,
    excludeId?: string,
  ) {
    const subs = await this.prisma.subProject.findMany({
      where: { parentProjectId },
      select: { id: true, name: true },
    });
    const lower = name.toLowerCase();
    const conflict = subs.find(
      (s: SubProjectIdName) =>
        s.name.toLowerCase() === lower && s.id !== excludeId,
    );
    if (conflict) {
      throw new ConflictException(
        'Sub project name already exists in this project',
      );
    }
  }
}
