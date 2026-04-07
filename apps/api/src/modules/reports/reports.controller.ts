import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('weekly.csv')
  async weeklyCsv(@Query('week') week: string, @Res() res: Response) {
    const csv = await this.service.generateWeeklyCsv(week);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="weekly-${week}.csv"`,
    );
    res.send(csv);
  }

  @Get('monthly.csv')
  async monthlyCsv(@Query('month') month: string, @Res() res: Response) {
    const csv = await this.service.generateMonthlyCsv(month);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="monthly-${month}.csv"`,
    );
    res.send(csv);
  }
}
