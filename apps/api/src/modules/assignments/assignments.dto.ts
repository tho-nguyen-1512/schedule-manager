import { IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  memberId: string;

  @IsString()
  projectId: string;

  @IsString()
  subProjectId: string;
}
