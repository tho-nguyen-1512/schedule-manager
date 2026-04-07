import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { ApiService } from '../../services/api.service';
import {
  defaultIsoWeekPeriod,
  parseIsoWeekPeriod,
  reportWeekSelectOptions,
  reportYearSelectOptions,
} from '../../services/dashboard-period.util';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.page.html',
  standalone: false,
})
export class ReportsPage implements OnInit {
  selectedMonth = '';
  /** ISO week-year for weekly CSV (matches dashboard ISO week). */
  reportYear = new Date().getFullYear();
  /** ISO week number 1–53 */
  reportWeek = 1;
  reportYearOptions: number[] = [];
  reportWeekOptions = reportWeekSelectOptions();

  constructor(private api: ApiService, private toastCtrl: ToastController) {}

  ngOnInit() {
    const now = new Date();
    this.selectedMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.reportYearOptions = reportYearSelectOptions(now);
    const def = defaultIsoWeekPeriod(now);
    const parsed = parseIsoWeekPeriod(def);
    if (parsed) {
      this.reportYear = parsed.year;
      this.reportWeek = parsed.week;
    } else {
      this.reportYear = now.getFullYear();
      this.reportWeek = 1;
    }
  }

  get weeklyCsvKey(): string {
    return `${this.reportYear}-W${String(this.reportWeek).padStart(2, '0')}`;
  }

  downloadMonthly() {
    if (!this.selectedMonth) return;
    this.api.downloadMonthlyCsv(this.selectedMonth);
    this.showToast(`Downloading monthly report for ${this.selectedMonth}`);
  }

  downloadWeekly() {
    if (this.reportYear == null || !this.reportWeek) return;
    const key = this.weeklyCsvKey;
    this.api.downloadWeeklyCsv(key);
    this.showToast(`Downloading weekly report for ${key}`);
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({ message, duration: 2000, color: 'success', position: 'top' });
    await toast.present();
  }
}
