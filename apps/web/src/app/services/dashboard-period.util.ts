export type DashboardPeriodType = 'week' | 'month' | 'quarter' | 'year';

export interface DashboardPeriodOption {
  label: string;
  value: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Match server `defaultIsoWeekPeriod`. */
export function defaultIsoWeekPeriod(now = new Date()): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = monday.getDay() || 7;
  monday.setDate(monday.getDate() - (dow - 1));
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const isoYear = thursday.getFullYear();
  const jan4 = new Date(isoYear, 0, 4);
  const j4d = jan4.getDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (j4d - 1));
  const diffDays = Math.round((monday.getTime() - mondayWeek1.getTime()) / 86400000);
  const week = Math.floor(diffDays / 7) + 1;
  return `${isoYear}-W${pad2(week)}`;
}

/** Parse `YYYY-Www` from {@link defaultIsoWeekPeriod} / API. */
export function parseIsoWeekPeriod(period: string): { year: number; week: number } | null {
  const m = period.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return null;
  return { year: parseInt(m[1], 10), week: parseInt(m[2], 10) };
}

/** Years shown in Reports weekly picker (around today). */
export function reportYearSelectOptions(now = new Date()): number[] {
  const cy = now.getFullYear();
  return [cy - 2, cy - 1, cy, cy + 1];
}

/** Weeks W1–W53 for the second select (same range as dashboard week options). */
export function reportWeekSelectOptions(): { label: string; value: number }[] {
  return Array.from({ length: 53 }, (_, i) => {
    const w = i + 1;
    return { label: `W${w}`, value: w };
  });
}

export function defaultMonthPeriod(now = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

export function defaultQuarterPeriod(now = new Date()): string {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()}-Q${q}`;
}

export function defaultYearPeriod(now = new Date()): string {
  return String(now.getFullYear());
}

export function defaultPeriodForType(type: DashboardPeriodType, now = new Date()): string {
  switch (type) {
    case 'week':
      return defaultIsoWeekPeriod(now);
    case 'month':
      return defaultMonthPeriod(now);
    case 'quarter':
      return defaultQuarterPeriod(now);
    case 'year':
      return defaultYearPeriod(now);
  }
}

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Options for the second control (covers a window of years around today). */
export function buildDashboardPeriodOptions(type: DashboardPeriodType): DashboardPeriodOption[] {
  const cy = new Date().getFullYear();
  const years = [cy - 2, cy - 1, cy, cy + 1];

  switch (type) {
    case 'year':
      return years.map((y) => ({ label: String(y), value: String(y) }));
    case 'quarter': {
      const roman = ['I', 'II', 'III', 'IV'];
      const out: DashboardPeriodOption[] = [];
      for (const y of years) {
        for (let q = 1; q <= 4; q++) {
          out.push({ label: `Q.${roman[q - 1]} ${y}`, value: `${y}-Q${q}` });
        }
      }
      return out;
    }
    case 'month': {
      const out: DashboardPeriodOption[] = [];
      for (const y of years) {
        for (let mo = 1; mo <= 12; mo++) {
          out.push({ label: `${MONTH_LONG[mo - 1]} ${y}`, value: `${y}-${pad2(mo)}` });
        }
      }
      return out;
    }
    case 'week': {
      const out: DashboardPeriodOption[] = [];
      for (const y of years) {
        for (let w = 1; w <= 53; w++) {
          out.push({ label: `W${w} · ${y}`, value: `${y}-W${pad2(w)}` });
        }
      }
      return out;
    }
  }
}
