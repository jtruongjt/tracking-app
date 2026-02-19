export function isDailyActivityEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DAILY_ACTIVITY !== "false";
}
