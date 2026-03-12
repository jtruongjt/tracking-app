import { getCurrentMonthKey } from "@/lib/date";
import { buildDashboardRows, buildTeamRollup } from "@/lib/scoring";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import {
  DailyActivity,
  DailyActivityExemption,
  DailyActivityExemptionStatus,
  Rep,
  RepActivityHistoryRow,
  RepPerformanceHistoryRow,
  SubTeam,
  Team
} from "@/lib/types";

function safeAttainment(actual: number, target: number): number {
  if (target <= 0) return 0;
  return actual / target;
}

function getPaceStatus(actual: number, target: number): "on_track" | "at_risk" | "behind" {
  if (target <= 0) return "on_track";
  const ratio = actual / target;
  if (ratio >= 1) return "on_track";
  if (ratio >= 0.9) return "at_risk";
  return "behind";
}

function getWeightedPaceStatus(weightedScore: number): "on_track" | "at_risk" | "behind" {
  if (weightedScore >= 100) return "on_track";
  if (weightedScore >= 90) return "at_risk";
  return "behind";
}

function teamWeightedScore(team: Team, tqrAttainment: number, nlAttainment: number | null): number {
  if (team === "expansion") return tqrAttainment * 100;
  return ((nlAttainment ?? 0) * 0.7 + tqrAttainment * 0.3) * 100;
}

export async function getActiveReps() {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase.from("rep").select("id,name,team,sub_team,active").eq("active", true).order("name");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{ id: string; name: string; team: Team; sub_team: SubTeam; active: boolean }>;
}

export async function getRepById(repId: string) {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("rep")
    .select("id,name,team,sub_team,active")
    .eq("id", repId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? null) as Rep | null;
}

export async function getCurrentTotalsForMonth(month = getCurrentMonthKey()) {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("current_totals")
    .select("rep_id,tqr_actual,nl_actual,updated_at")
    .eq("month", month);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{
    rep_id: string;
    tqr_actual: number;
    nl_actual: number | null;
    updated_at: string;
  }>;
}

export async function getDashboardData(month = getCurrentMonthKey()) {
  const supabase = getSupabaseAnonServerClient();

  const [repsResult, targetsResult, totalsResult] = await Promise.all([
    supabase.from("rep").select("id,name,team,sub_team").eq("active", true),
    supabase.from("monthly_target").select("rep_id,tqr_target,nl_target").eq("month", month),
    supabase.from("current_totals").select("rep_id,tqr_actual,nl_actual").eq("month", month)
  ]);

  if (repsResult.error) throw new Error(repsResult.error.message);
  if (targetsResult.error) throw new Error(targetsResult.error.message);
  if (totalsResult.error) throw new Error(totalsResult.error.message);

  const rows = buildDashboardRows({
    reps: (repsResult.data ?? []) as Array<{ id: string; name: string; team: Team; sub_team: SubTeam }>,
    targets: (targetsResult.data ?? []) as Array<{ rep_id: string; tqr_target: number; nl_target: number | null }>,
    totals: (totalsResult.data ?? []) as Array<{ rep_id: string; tqr_actual: number; nl_actual: number | null }>,
    month
  });

  return {
    month,
    rows,
    rollup: buildTeamRollup(rows)
  };
}

export async function getRepPerformanceHistory(rep: Pick<Rep, "id" | "team">) {
  const supabase = getSupabaseAnonServerClient();
  const currentMonth = getCurrentMonthKey();
  const [targetsResult, totalsResult] = await Promise.all([
    supabase
      .from("monthly_target")
      .select("month,tqr_target,nl_target")
      .eq("rep_id", rep.id)
      .order("month", { ascending: false }),
    supabase
      .from("current_totals")
      .select("month,tqr_actual,nl_actual")
      .eq("rep_id", rep.id)
      .order("month", { ascending: false })
  ]);

  if (targetsResult.error) throw new Error(targetsResult.error.message);
  if (totalsResult.error) throw new Error(totalsResult.error.message);

  const targetMap = new Map((targetsResult.data ?? []).map((row) => [row.month, row]));
  const totalsMap = new Map((totalsResult.data ?? []).map((row) => [row.month, row]));
  const months = new Set<string>([...targetMap.keys(), ...totalsMap.keys()]);

  return Array.from(months)
    .filter((month) => month <= currentMonth)
    .sort((a, b) => b.localeCompare(a))
    .map((month): RepPerformanceHistoryRow => {
      const target = targetMap.get(month);
      const total = totalsMap.get(month);
      const tqrTarget = Number(target?.tqr_target ?? 0);
      const tqrActual = Number(total?.tqr_actual ?? 0);
      const nlTarget = rep.team === "new_logo" ? (target?.nl_target === null || target?.nl_target === undefined ? null : Number(target.nl_target)) : null;
      const nlActual = rep.team === "new_logo" ? (total?.nl_actual === null || total?.nl_actual === undefined ? null : Number(total.nl_actual)) : null;
      const tqrAttainment = safeAttainment(tqrActual, tqrTarget);
      const nlAttainment = rep.team === "new_logo" && nlTarget !== null ? safeAttainment(nlActual ?? 0, nlTarget) : null;
      const weightedScore = teamWeightedScore(rep.team, tqrAttainment, nlAttainment);
      const paceStatus = rep.team === "expansion" ? getPaceStatus(tqrActual, tqrTarget) : getWeightedPaceStatus(weightedScore);

      return {
        month,
        tqrTarget,
        tqrActual,
        tqrAttainment,
        nlTarget,
        nlActual,
        nlAttainment,
        weightedScore,
        paceStatus
      };
    });
}

export async function upsertCurrentTotals(input: {
  repId: string;
  month: string;
  tqrActual: number;
  nlActual: number | null;
}) {
  const supabase = getSupabaseServiceClient();
  const payload = {
    rep_id: input.repId,
    month: input.month,
    tqr_actual: input.tqrActual,
    nl_actual: input.nlActual
  };

  const { error } = await supabase.from("current_totals").upsert(payload, { onConflict: "rep_id,month" });
  if (error) throw new Error(error.message);
}

export async function getDailyActivityForDate(activityDate: string) {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("daily_activity")
    .select("rep_id,activity_date,sdr_events,events_created,events_held,notes,updated_at")
    .eq("activity_date", activityDate)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as DailyActivity[];
}

export async function getDailyActivityForRange(startDate: string, endDate: string) {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("daily_activity")
    .select("rep_id,activity_date,sdr_events,events_created,events_held,notes,updated_at")
    .gte("activity_date", startDate)
    .lte("activity_date", endDate);

  if (error) throw new Error(error.message);
  return (data ?? []) as DailyActivity[];
}

export async function getRepActivityHistory(repId: string, startDate: string, endDate: string) {
  const supabase = getSupabaseAnonServerClient();
  const [activityResult, exemptionResult] = await Promise.all([
    supabase
      .from("daily_activity")
      .select("activity_date,sdr_events,events_created,events_held,notes,updated_at")
      .eq("rep_id", repId)
      .gte("activity_date", startDate)
      .lte("activity_date", endDate)
      .order("activity_date", { ascending: false }),
    supabase
      .from("daily_activity_exemption")
      .select("activity_date,status,note")
      .eq("rep_id", repId)
      .gte("activity_date", startDate)
      .lte("activity_date", endDate)
      .order("activity_date", { ascending: false })
  ]);

  if (activityResult.error) throw new Error(activityResult.error.message);
  if (exemptionResult.error) throw new Error(exemptionResult.error.message);

  const activityMap = new Map((activityResult.data ?? []).map((row) => [row.activity_date, row]));
  const exemptionMap = new Map((exemptionResult.data ?? []).map((row) => [row.activity_date, row]));
  const dates = new Set<string>([...activityMap.keys(), ...exemptionMap.keys()]);

  return Array.from(dates)
    .sort((a, b) => b.localeCompare(a))
    .map((activityDate): RepActivityHistoryRow => {
      const activity = activityMap.get(activityDate);
      const exemption = exemptionMap.get(activityDate);

      return {
        activity_date: activityDate,
        sdr_events: activity?.sdr_events ?? 0,
        events_created: activity?.events_created ?? 0,
        events_held: activity?.events_held ?? 0,
        notes: activity?.notes ?? null,
        updated_at: activity?.updated_at ?? "",
        exemption_status: (exemption?.status ?? null) as DailyActivityExemptionStatus | null,
        exemption_note: exemption?.note ?? null
      };
    });
}

export async function getDailyActivityExemptionsForRange(startDate: string, endDate: string) {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase
    .from("daily_activity_exemption")
    .select("rep_id,activity_date,status,note,updated_at")
    .gte("activity_date", startDate)
    .lte("activity_date", endDate);

  if (error) throw new Error(error.message);
  return (data ?? []) as DailyActivityExemption[];
}

export async function upsertDailyActivity(input: {
  repId: string;
  activityDate: string;
  sdrEvents: number;
  eventsCreated: number;
  eventsHeld: number;
  notes: string | null;
}) {
  const supabase = getSupabaseServiceClient();
  const payload = {
    rep_id: input.repId,
    activity_date: input.activityDate,
    sdr_events: input.sdrEvents,
    events_created: input.eventsCreated,
    events_held: input.eventsHeld,
    notes: input.notes
  };

  const { error } = await supabase.from("daily_activity").upsert(payload, { onConflict: "rep_id,activity_date" });
  if (error) throw new Error(error.message);
}

export async function upsertDailyActivityExemption(input: {
  repId: string;
  activityDate: string;
  status: DailyActivityExemptionStatus;
  note: string | null;
}) {
  const supabase = getSupabaseServiceClient();
  const payload = {
    rep_id: input.repId,
    activity_date: input.activityDate,
    status: input.status,
    note: input.note
  };

  const { error } = await supabase.from("daily_activity_exemption").upsert(payload, { onConflict: "rep_id,activity_date" });
  if (error) throw new Error(error.message);
}

export async function clearDailyActivityExemption(input: { repId: string; activityDate: string }) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("daily_activity_exemption")
    .delete()
    .eq("rep_id", input.repId)
    .eq("activity_date", input.activityDate);

  if (error) throw new Error(error.message);
}
