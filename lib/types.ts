export type Team = "expansion" | "new_logo";
export type SubTeam = "team_lucy" | "team_ryan" | "team_justin" | "team_kyra";

export interface Rep {
  id: string;
  name: string;
  team: Team;
  sub_team: SubTeam;
  active: boolean;
}

export interface MonthlyTarget {
  rep_id: string;
  month: string;
  tqr_target: number;
  nl_target: number | null;
}

export interface CurrentTotal {
  rep_id: string;
  month: string;
  tqr_actual: number;
  nl_actual: number | null;
  updated_at: string;
}

export type PaceStatus = "on_track" | "at_risk" | "behind";

export interface DashboardRow {
  repId: string;
  repName: string;
  team: Team;
  subTeam: SubTeam;
  tqrActual: number;
  tqrTarget: number;
  tqrExpectedToDate: number;
  tqrGapToPace: number;
  tqrAttainment: number;
  nlActual: number | null;
  nlTarget: number | null;
  nlExpectedToDate: number | null;
  nlGapToPace: number | null;
  nlAttainment: number | null;
  weightedScore: number;
  weightedExpectedToDate: number;
  weightedGapToPace: number;
  paceStatus: PaceStatus;
}
