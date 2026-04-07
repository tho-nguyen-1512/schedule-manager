import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './assignments.dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Get()
  findAll(
    @Query('memberId') memberId?: string,
    @Query('projectId') projectId?: string,
    @Query('subProjectId') subProjectId?: string,
  ) {
    return this.service.findAll({ memberId, projectId, subProjectId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAssignmentDto) {
    return this.service.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
