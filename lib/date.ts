export function getCurrentMonthKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function isMonthKey(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value);
}

export function normalizeMonthParam(value?: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  if (isMonthKey(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(0, 7);
  const match = raw.match(/^\d{4}-\d{2}/);
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
