import type { BudgetPeriod } from "@finanzas/shared";

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISODate(): string {
  return toISODate(new Date());
}

export function getCurrentPeriodRange(period: BudgetPeriod): {
  start_date: string;
  end_date: string;
} {
  const now = new Date();

  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start_date: toISODate(start), end_date: toISODate(end) };
  }

  // weekly: Monday–Sunday of the current week
  const dayOfWeek = now.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return { start_date: toISODate(start), end_date: toISODate(end) };
}

export function currentMonthString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(month: string, delta: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthDateRange(month: string): { from: string; to: string } {
  const [year, monthNum] = month.split("-").map(Number);
  const start = new Date(year, monthNum - 1, 1);
  const end = new Date(year, monthNum, 0);
  return { from: toISODate(start), to: toISODate(end) };
}

export interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
}

// Monday-first 6-week grid (42 cells) for a "YYYY-MM" month — same week convention as
// getCurrentPeriodRange's weekly budgets. Leading/trailing cells from adjacent months are
// included (marked inMonth: false) so the grid is always a full, tappable calendar page.
export function getMonthGrid(month: string): CalendarDay[] {
  const [year, monthNum] = month.split("-").map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const firstWeekday = firstOfMonth.getDay();
  const diffToMonday = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const gridStart = new Date(year, monthNum - 1, 1 - diffToMonday);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    return {
      date: toISODate(date),
      day: date.getDate(),
      inMonth: date.getMonth() === monthNum - 1 && date.getFullYear() === year,
    };
  });
}

export function monthStringFromDate(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function formatMonthLabel(month: string): string {
  const [year, monthNum] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(
    new Date(year, monthNum - 1, 1)
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}
