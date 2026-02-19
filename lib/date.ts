export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getCurrentDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  return new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
}

export function dateKeyToDate(dateKey: string): Date {
  return parseDateKey(dateKey);
}

export function getWeekStartDate(date = new Date()): Date {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + mondayOffset);
  return copy;
}

export function getWeekStartKey(date = new Date()): string {
  return getCurrentDateKey(getWeekStartDate(date));
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return getCurrentDateKey(date);
}

export function toWeekLabel(weekStartKey: string): string {
  const start = parseDateKey(weekStartKey);
  const end = parseDateKey(addDays(weekStartKey, 6));
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} - ${endLabel}`;
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function normalizeMonthParam(value?: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  if (isMonthKey(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  const match = raw.match(/^\d{4}-\d{2}/);
  return match ? match[0] : null;
}

export function normalizeDateParam(value?: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  if (isDateKey(raw)) return raw;
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

export function getMonthElapsedRatio(date = new Date()): number {
  const day = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return day / daysInMonth;
}

export function toMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function toDateLabel(dateKey: string): string {
  const [yearStr, monthStr, dayStr] = dateKey.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
