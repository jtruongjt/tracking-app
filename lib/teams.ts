import { SubTeam, Team } from "@/lib/types";

export const expansionSubTeams: SubTeam[] = ["team_lucy", "team_ryan", "team_mike", "team_bridger"];
export const newLogoSubTeams: SubTeam[] = ["team_justin", "team_kyra", "team_sydney"];
export const allSubTeams: SubTeam[] = [...expansionSubTeams, ...newLogoSubTeams];

export function labelForSubTeam(subTeam: SubTeam): string {
  if (subTeam === "team_lucy") return "Team Lucy";
  if (subTeam === "team_ryan") return "Team Ryan";
  if (subTeam === "team_mike") return "Team Mike";
  if (subTeam === "team_bridger") return "Team Bridger";
  if (subTeam === "team_justin") return "Team Justin";
  if (subTeam === "team_sydney") return "Team Sydney";
  return "Team Kyra";
}

export function teamForSubTeam(subTeam: SubTeam): Team {
  return expansionSubTeams.includes(subTeam) ? "expansion" : "new_logo";
}
