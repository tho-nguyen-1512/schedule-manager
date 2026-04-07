export type PeriodType = 'week' | 'month' | 'quarter' | 'year';

const PERIOD_TYPES: Set<string> = new Set(['week', 'month', 'quarter', 'year']);

export function normalizePeriodType(raw: string | undefined): PeriodType {
  const t = (raw || 'month').toLowerCase();
  if (!PERIOD_TYPES.has(t)) {
    throw new Error(`Invalid periodType: ${raw}`);
  }
  return t as PeriodType;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local calendar date YYYY-MM-DD (matches stored task dates). */
function fmtLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** ISO week string for `now` (week 1 contains Jan 4; ISO year may differ near Jan/Dec). */
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

export function defaultPeriodForType(type: PeriodType, now = new Date()): string {
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

/**
 * Parse `YYYY-Www` to local Monday–Sunday inclusive as YYYY-MM-DD.
 */
function boundsForWeek(period: string): { start: string; end: string } {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(period.trim());
  if (!m) throw new Error(`Invalid week period: ${period}`);
  const isoYear = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) throw new Error(`Invalid week number: ${week}`);

  const jan4 = new Date(isoYear, 0, 4);
  const j4d = jan4.getDay() || 7;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() - (j4d - 1));
  const monday = new Date(mondayWeek1);
  monday.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: fmtLocal(monday), end: fmtLocal(sunday) };
}

function boundsForMonth(period: string): { start: string; end: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(period.trim());
  if (!m) throw new Error(`Invalid month period: ${period}`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) throw new Error(`Invalid month: ${mo}`);
  const start = `${y}-${pad2(mo)}-01`;
  const last = new Date(y, mo, 0).getDate();
  const end = `${y}-${pad2(mo)}-${pad2(last)}`;
  return { start, end };
}

function boundsForQuarter(period: string): { start: string; end: string } {
  const m = /^(\d{4})-Q([1-4])$/.exec(period.trim());
  if (!m) throw new Error(`Invalid quarter period: ${period}`);
  const y = Number(m[1]);
  const q = Number(m[2]);
  const m0 = (q - 1) * 3 + 1;
  const start = `${y}-${pad2(m0)}-01`;
  const mEnd = m0 + 2;
  const last = new Date(y, mEnd, 0).getDate();
  const end = `${y}-${pad2(mEnd)}-${pad2(last)}`;
  return { start, end };
}

function boundsForYear(period: string): { start: string; end: string } {
  const m = /^(\d{4})$/.exec(period.trim());
  if (!m) throw new Error(`Invalid year period: ${period}`);
  const y = Number(m[1]);
  return { start: `${y}-01-01`, end: `${y}-12-31` };
}

export function getPeriodBounds(type: PeriodType, period: string): { start: string; end: string } {
  switch (type) {
    case 'week':
      return boundsForWeek(period);
    case 'month':
      return boundsForMonth(period);
    case 'quarter':
      return boundsForQuarter(period);
    case 'year':
      return boundsForYear(period);
  }
}
