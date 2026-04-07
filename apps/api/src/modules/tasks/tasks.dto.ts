import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsString()
  memberId: string;

  @IsString()
  projectId: string;

  @IsString()
  @IsOptional()
  subProjectId?: string;

  @IsString()
  startDate: string;

  @IsString()
  endDate: string;

  @IsString()
  @IsOptional()
  completionDate?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent: number;

  @IsIn(STATUSES)
  status: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsIn(PRIORITIES)
  priority: string;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  memberId?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  subProjectId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  completionDate?: string | null;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  progressPercent?: number;

  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  @IsOptional()
  priority?: string;
}
