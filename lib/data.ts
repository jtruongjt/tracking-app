import { getCurrentMonthKey } from "@/lib/date";
import { buildDashboardRows, buildTeamRollup } from "@/lib/scoring";
import { getSupabaseAnonServerClient, getSupabaseServiceClient } from "@/lib/supabase/server";
import { SubTeam, Team } from "@/lib/types";

export async function getActiveReps() {
  const supabase = getSupabaseAnonServerClient();
  const { data, error } = await supabase.from("rep").select("id,name,team,sub_team,active").eq("active", true).order("name");
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{ id: string; name: string; team: Team; sub_team: SubTeam; active: boolean }>;
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
    totals: (totalsResult.data ?? []) as Array<{ rep_id: string; tqr_actual: number; nl_actual: number | null }>
  });

  return {
    month,
    rows,
    rollup: buildTeamRollup(rows)
  };
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
