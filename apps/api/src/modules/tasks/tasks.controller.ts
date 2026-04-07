import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Get()
  findAll(
    @Query('memberId') memberId?: string,
    @Query('projectId') projectId?: string,
    @Query('subProjectId') subProjectId?: string,
    @Query('status') status?: string,
    @Query('week') week?: string,
    @Query('month') month?: string,
  ) {
    return this.service.findAll({
      memberId,
      projectId,
      subProjectId,
      status,
      week,
      month,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
