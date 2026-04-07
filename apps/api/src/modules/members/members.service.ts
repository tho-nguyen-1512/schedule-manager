import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemberDto, UpdateMemberDto } from './members.dto';

const memberFindInclude = {
  coreProjects: { select: { projectId: true } },
  supportProjects: { select: { projectId: true } },
} as const;

type MemberWithInclude = Prisma.MemberGetPayload<{
  include: typeof memberFindInclude;
}>;

type MemberIdName = { id: string; name: string };

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  private readonly include = memberFindInclude;

  private formatMember(member: any) {
    const { coreProjects, supportProjects, ...rest } = member;
    return {
      ...rest,
      coreProjectIds: coreProjects?.map((cp: any) => cp.projectId) ?? [],
      supProjectIds: supportProjects?.map((sp: any) => sp.projectId) ?? [],
    };
  }

  async findAll() {
    const members = await this.prisma.member.findMany({
      include: this.include,
    });
    return {
      items: members.map((m: MemberWithInclude) => this.formatMember(m)),
    };
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: this.include,
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.formatMember(member);
  }

  async create(dto: CreateMemberDto) {
    await this.checkUniqueName(dto.name);

    const { coreProjectIds, supProjectIds, ...data } = dto;
    const member = await this.prisma.member.create({
      data: {
        ...data,
        coreProjects: coreProjectIds?.length
          ? { create: coreProjectIds.map((projectId) => ({ projectId })) }
          : undefined,
        supportProjects: supProjectIds?.length
          ? { create: supProjectIds.map((projectId) => ({ projectId })) }
          : undefined,
      },
      include: this.include,
    });
    return this.formatMember(member);
  }

  async update(id: string, dto: UpdateMemberDto) {
    await this.findOne(id);
    if (dto.name) await this.checkUniqueName(dto.name, id);

    const { coreProjectIds, supProjectIds, ...data } = dto;

    if (coreProjectIds !== undefined) {
      await this.prisma.memberCoreProject.deleteMany({
        where: { memberId: id },
      });
    }
    if (supProjectIds !== undefined) {
      await this.prisma.memberSupportProject.deleteMany({
        where: { memberId: id },
      });
    }

    const member = await this.prisma.member.update({
      where: { id },
      data: {
        ...data,
        coreProjects:
          coreProjectIds !== undefined
            ? { create: coreProjectIds.map((projectId) => ({ projectId })) }
            : undefined,
        supportProjects:
          supProjectIds !== undefined
            ? { create: supProjectIds.map((projectId) => ({ projectId })) }
            : undefined,
      },
      include: this.include,
    });
    return this.formatMember(member);
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.task.updateMany({
      where: { memberId: id },
      data: { memberId: null },
    });
    await this.prisma.assignment.updateMany({
      where: { memberId: id },
      data: { memberId: null },
    });

    await this.prisma.member.delete({ where: { id } });
  }

  private async checkUniqueName(name: string, excludeId?: string) {
    const allMembers = await this.prisma.member.findMany({
      select: { id: true, name: true },
    });
    const lowerName = name.toLowerCase();
    const conflict = allMembers.find(
      (m: MemberIdName) =>
        m.name.toLowerCase() === lowerName && m.id !== excludeId,
    );
    if (conflict) {
      throw new ConflictException('Member name already exists');
    }
  }
}
