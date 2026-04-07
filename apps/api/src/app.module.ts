import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { MembersModule } from './modules/members/members.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    PrismaModule,
    MembersModule,
    ProjectsModule,
    AssignmentsModule,
    TasksModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
