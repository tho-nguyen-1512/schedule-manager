import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateSubProjectDto,
  UpdateSubProjectDto,
} from './projects.dto';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProjectDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':projectId/sub-projects')
  @HttpCode(HttpStatus.CREATED)
  createSubProject(
    @Param('projectId') projectId: string,
    @Body() dto: CreateSubProjectDto,
  ) {
    return this.service.createSubProject(projectId, dto);
  }
}

@Controller('sub-projects')
export class SubProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSubProjectDto) {
    return this.service.updateSubProject(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.removeSubProject(id);
  }
}
