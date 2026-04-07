import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  getSummary(
    @Query('periodType') periodType?: string,
    @Query('period') period?: string
  ) {
    return this.service.getSummary(periodType, period);
  }
}
