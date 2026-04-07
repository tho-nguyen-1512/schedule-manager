import { Module } from '@nestjs/common';
import {
  ProjectsController,
  SubProjectsController,
} from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController, SubProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
