import {
  IsString,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateMemberDto {
  @IsString()
  name: string;

  @IsArray()
  @IsString({ each: true })
  coreProjectIds: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supProjectIds?: string[];

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  startDate?: string;
}

export class UpdateMemberDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  coreProjectIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supProjectIds?: string[];

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  startDate?: string;
}
