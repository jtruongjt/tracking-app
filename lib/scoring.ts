import { getMonthElapsedRatio } from "@/lib/date";
import { DashboardRow, PaceStatus, SubTeam, Team } from "@/lib/types";

function safeAttainment(actual: number, target: number): number {
  if (target <= 0) {
    return 0;
  }
  return actual / target;
}

function getPaceStatus(actual: number, target: number, elapsedRatio: number): PaceStatus {
  if (target <= 0) {
    return "on_track";
  }
  const expectedNow = target * elapsedRatio;
  if (expectedNow <= 0) {
    return "on_track";
  }
  const ratioVsExpected = actual / expectedNow;
  if (ratioVsExpected >= 1) {
    return "on_track";
  }
  if (ratioVsExpected >= 0.9) {
    return "at_risk";
  }
  return "behind";
}

function teamWeightedScore(team: Team, tqrAttainment: number, nlAttainment: number | null): number {
  if (team === "expansion") {
    return tqrAttainment * 100;
  }
  const nlValue = nlAttainment ?? 0;
  return (nlValue * 0.7 + tqrAttainment * 0.3) * 100;
}

export function buildDashboardRows(input: {
  reps: Array<{ id: string; name: string; team: Team; sub_team: SubTeam }>;
  targets: Array<{ rep_id: string; tqr_target: number; nl_target: number | null }>;
  totals: Array<{ rep_id: string; tqr_actual: number; nl_actual: number | null }>;
  now?: Date;
}): DashboardRow[] {
  const targetMap = new Map(input.targets.map((t) => [t.rep_id, t]));
  const totalsMap = new Map(input.totals.map((t) => [t.rep_id, t]));
  const elapsedRatio = getMonthElapsedRatio(input.now ?? new Date());

  const rows = input.reps.map((rep) => {
    const target = targetMap.get(rep.id);
    const total = totalsMap.get(rep.id);

    const tqrTarget = target?.tqr_target ?? 0;
    const nlTarget = target?.nl_target ?? null;

    const tqrActual = total?.tqr_actual ?? 0;
    const nlActual = rep.team === "new_logo" ? total?.nl_actual ?? 0 : null;

    const tqrAttainment = safeAttainment(tqrActual, tqrTarget);
    const nlAttainment = rep.team === "new_logo" && nlTarget !== null ? safeAttainment(nlActual ?? 0, nlTarget) : null;

    const weightedScore = teamWeightedScore(rep.team, tqrAttainment, nlAttainment);

    let paceStatus: PaceStatus;
    if (rep.team === "expansion") {
      paceStatus = getPaceStatus(tqrActual, tqrTarget, elapsedRatio);
    } else {
      const tqrPace = getPaceStatus(tqrActual, tqrTarget, elapsedRatio);
      const nlPace = getPaceStatus(nlActual ?? 0, nlTarget ?? 0, elapsedRatio);
      if (tqrPace === "behind" || nlPace === "behind") {
        paceStatus = "behind";
      } else if (tqrPace === "at_risk" || nlPace === "at_risk") {
        paceStatus = "at_risk";
      } else {
        paceStatus = "on_track";
      }
    }

    return {
      repId: rep.id,
      repName: rep.name,
      team: rep.team,
      subTeam: rep.sub_team,
      tqrActual,
      tqrTarget,
      tqrAttainment,
      nlActual,
      nlTarget,
      nlAttainment,
      weightedScore,
      paceStatus
    };
  });

  return rows.sort((a, b) => b.weightedScore - a.weightedScore);
}

export function buildTeamRollup(rows: DashboardRow[]) {
  const expansionRows = rows.filter((r) => r.team === "expansion");
  const newLogoRows = rows.filter((r) => r.team === "new_logo");

  const expansionTarget = expansionRows.reduce((sum, row) => sum + row.tqrTarget, 0);
  const expansionActual = expansionRows.reduce((sum, row) => sum + row.tqrActual, 0);
  const expansionWeightedAverage = expansionRows.length
    ? expansionRows.reduce((sum, row) => sum + row.weightedScore, 0) / expansionRows.length
    : 0;

  const newLogoTqrTarget = newLogoRows.reduce((sum, row) => sum + row.tqrTarget, 0);
  const newLogoTqrActual = newLogoRows.reduce((sum, row) => sum + row.tqrActual, 0);
  const newLogoNlTarget = newLogoRows.reduce((sum, row) => sum + (row.nlTarget ?? 0), 0);
  const newLogoNlActual = newLogoRows.reduce((sum, row) => sum + (row.nlActual ?? 0), 0);
  const newLogoWeightedAverage = newLogoRows.length
    ? newLogoRows.reduce((sum, row) => sum + row.weightedScore, 0) / newLogoRows.length
    : 0;

  return {
    expansion: {
      tqrActual: expansionActual,
      tqrTarget: expansionTarget,
      weightedAverage: expansionWeightedAverage
    },
    newLogo: {
      tqrActual: newLogoTqrActual,
      tqrTarget: newLogoTqrTarget,
      nlActual: newLogoNlActual,
      nlTarget: newLogoNlTarget,
      weightedAverage: newLogoWeightedAverage
    }
  };
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatScorePercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  });
}
