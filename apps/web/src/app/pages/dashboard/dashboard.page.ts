import { Component, OnInit } from '@angular/core';
import { ApiService, DashboardSummary } from '../../services/api.service';
import {
  buildDashboardPeriodOptions,
  defaultPeriodForType,
  type DashboardPeriodOption,
  type DashboardPeriodType,
} from '../../services/dashboard-period.util';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  summary: DashboardSummary | null = null;

  statusDoughnutData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  statusDoughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom' },
    },
  };

  /** Segment: ontime = show DONE task counts; delay = show delayed task counts. */
  memberWorkloadMode: 'ontime' | 'delay' = 'ontime';

  memberWorkloadBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  memberWorkloadBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  projectHealthStackedData: ChartData<'bar'> = { labels: [], datasets: [] };
  projectHealthStackedOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    scales: {
      x: { stacked: true, ticks: { maxRotation: 50, minRotation: 0 } },
      y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  /** Upcoming due chart: 7 or 14 days (not scoped by dashboard period). */
  upcomingDueHorizon: 7 | 14 = 7;
  upcomingDueBarData: ChartData<'bar'> = { labels: [], datasets: [] };
  upcomingDueBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 10, font: { size: 10 }, padding: 8 },
      },
    },
    scales: {
      x: { stacked: true, ticks: { maxRotation: 55, minRotation: 0, font: { size: 10 } } },
      y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  dashboardPeriodType: DashboardPeriodType = 'month';
  dashboardPeriodValue = '';
  dashboardPeriodOptions: DashboardPeriodOption[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.dashboardPeriodType = 'month';
    this.dashboardPeriodValue = defaultPeriodForType('month');
    this.refreshDashboardPeriodOptions();
    this.loadDashboard();
  }

  get dashboardPeriodLabel(): string {
    return (
      this.dashboardPeriodOptions.find((o) => o.value === this.dashboardPeriodValue)?.label ??
      this.dashboardPeriodValue
    );
  }

  refreshDashboardPeriodOptions() {
    this.dashboardPeriodOptions = buildDashboardPeriodOptions(this.dashboardPeriodType);
    const ok = this.dashboardPeriodOptions.some((o) => o.value === this.dashboardPeriodValue);
    if (!ok) {
      this.dashboardPeriodValue = defaultPeriodForType(this.dashboardPeriodType);
    }
  }

  onDashboardPeriodTypeChange() {
    this.refreshDashboardPeriodOptions();
    this.dashboardPeriodValue = defaultPeriodForType(this.dashboardPeriodType);
    this.loadDashboard();
  }

  onDashboardPeriodValueChange() {
    this.loadDashboard();
  }

  get statusChartTotal(): number {
    const s = this.summary?.taskStatusDistribution;
    if (!s) return 0;
    return s.todo + s.inProgress + s.done;
  }

  get upcomingDueHasSeries(): boolean {
    return (this.summary?.upcomingDueByDay?.[0]?.byProject?.length ?? 0) > 0;
  }

  private loadDashboard() {
    this.api
      .getDashboard(this.dashboardPeriodType, this.dashboardPeriodValue)
      .subscribe((data) => {
        this.summary = data;
        this.applyDashboardCharts(data);
      });
  }

  private applyDashboardCharts(d: DashboardSummary) {
    const dist = d.taskStatusDistribution;
    this.statusDoughnutData = {
      labels: ['TODO', 'IN_PROGRESS', 'DONE'],
      datasets: [
        {
          data: [dist.todo, dist.inProgress, dist.done],
          backgroundColor: ['#94a3b8', '#ffc409', '#2dd36f'],
          borderWidth: 0,
        },
      ],
    };

    this.applyMemberWorkloadChart();
    this.applyProjectHealthChart(d);
    this.applyUpcomingDueChart(d);
  }

  onMemberWorkloadModeChange() {
    this.applyMemberWorkloadChart();
  }

  private applyMemberWorkloadChart() {
    if (!this.summary?.memberWorkloadRanking) {
      return;
    }
    const rows = [...this.summary.memberWorkloadRanking];
    const ontime = this.memberWorkloadMode === 'ontime';
    rows.sort((a, b) => {
      const va = ontime ? a.doneTaskCount : a.delayedTaskCount;
      const vb = ontime ? b.doneTaskCount : b.delayedTaskCount;
      return vb - va || a.memberName.localeCompare(b.memberName);
    });
    this.memberWorkloadBarData = {
      labels: rows.map((r) => r.memberName),
      datasets: [
        {
          label: ontime ? 'Done tasks' : 'Delayed tasks',
          data: rows.map((r) => (ontime ? r.doneTaskCount : r.delayedTaskCount)),
          backgroundColor: ontime ? '#2dd36f' : '#eb445a',
        },
      ],
    };
  }

  onUpcomingHorizonChange() {
    const n = Number(this.upcomingDueHorizon);
    this.upcomingDueHorizon = n === 14 ? 14 : 7;
    if (this.summary) {
      this.applyUpcomingDueChart(this.summary);
    }
  }

  private truncateChartLabel(s: string, maxLen = 22): string {
    const t = s.trim();
    return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
  }

  private formatDueDayLabel(isoDate: string): string {
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private applyProjectHealthChart(d: DashboardSummary) {
    const rows = d.projectHealthByProject ?? [];
    const labels = rows.map((r) => this.truncateChartLabel(r.projectName));
    this.projectHealthStackedData = {
      labels,
      datasets: [
        {
          label: 'Done',
          data: rows.map((r) => r.doneCount),
          backgroundColor: '#2dd36f',
          borderWidth: 0,
        },
        {
          label: 'On-track',
          data: rows.map((r) => r.inProgressCount),
          backgroundColor: '#4a90d9',
          borderWidth: 0,
        },
        {
          label: 'Delayed',
          data: rows.map((r) => r.delayedCount),
          backgroundColor: '#eb445a',
          borderWidth: 0,
        },
      ],
    };
  }

  private static readonly UPCOMING_PROJECT_COLORS = [
    '#6366f1',
    '#ec4899',
    '#14b8a6',
    '#f59e0b',
    '#8b5cf6',
    '#ef4444',
    '#22c55e',
    '#0ea5e9',
    '#a855f7',
    '#f97316',
  ];

  private upcomingProjectColor(index: number): string {
    const pal = DashboardPage.UPCOMING_PROJECT_COLORS;
    return pal[index % pal.length];
  }

  private applyUpcomingDueChart(d: DashboardSummary) {
    const days = d.upcomingDueByDay ?? [];
    const slice = days.slice(0, this.upcomingDueHorizon);
    const labels = slice.map((x) => this.formatDueDayLabel(x.date));
    const template = slice[0]?.byProject ?? [];
    if (template.length === 0) {
      this.upcomingDueBarData = { labels, datasets: [] };
      return;
    }
    this.upcomingDueBarData = {
      labels,
      datasets: template.map((p, i) => ({
        label: p.projectName,
        data: slice.map(
          (day) => day.byProject?.find((x) => x.projectId === p.projectId)?.count ?? 0
        ),
        backgroundColor: this.upcomingProjectColor(i),
        borderWidth: 0,
      })),
    };
  }
}
