import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  name: string;

  @IsArray()
  @IsOptional()
  emails?: string[];

  @IsArray()
  @IsOptional()
  resources?: string[];

  @IsArray()
  @IsOptional()
  documents?: string[];
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsOptional()
  emails?: string[];

  @IsArray()
  @IsOptional()
  resources?: string[];

  @IsArray()
  @IsOptional()
  documents?: string[];
}

export class CreateSubProjectDto {
  @IsString()
  name: string;
}

export class UpdateSubProjectDto {
  @IsString()
  @IsOptional()
  name?: string;
}
