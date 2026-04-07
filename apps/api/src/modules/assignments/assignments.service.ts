import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAssignmentDto } from './assignments.dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: {
    memberId?: string;
    projectId?: string;
    subProjectId?: string;
  }) {
    const where: any = {};
    if (query.memberId) where.memberId = query.memberId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.subProjectId) where.subProjectId = query.subProjectId;

    const items = await this.prisma.assignment.findMany({
      where,
      include: {
        member: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        subProject: { select: { id: true, name: true } },
      },
    });
    return { items };
  }

  async create(dto: CreateAssignmentDto) {
    const existing = await this.prisma.assignment.findUnique({
      where: {
        memberId_projectId_subProjectId: {
          memberId: dto.memberId,
          projectId: dto.projectId,
          subProjectId: dto.subProjectId,
        },
      },
    });
    if (existing) {
      throw new ConflictException('Assignment already exists');
    }

    return this.prisma.assignment.create({ data: dto });
  }

  async remove(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.prisma.assignment.delete({ where: { id } });
  }
}
