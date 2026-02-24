"use client";

import { useRef } from "react";
import { SubTeam, Team } from "@/lib/types";

type Props = {
  view: "day" | "week";
  activityDate: string;
  weekStart: string;
  team: Team | "all";
  subTeam: SubTeam | "all";
  subTeamOptions: SubTeam[];
};

function labelForSubTeam(subTeam: SubTeam): string {
  if (subTeam === "team_lucy") return "Team Lucy";
  if (subTeam === "team_ryan") return "Team Ryan";
  if (subTeam === "team_mike") return "Team Mike";
  if (subTeam === "team_bridger") return "Team Bridger";
  if (subTeam === "team_justin") return "Team Justin";
  if (subTeam === "team_sydney") return "Team Sydney";
  return "Team Kyra";
}

export function ActivityFilterForm({
  view,
  activityDate,
  weekStart,
  team,
  subTeam,
  subTeamOptions
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function submitOnChange() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="GET" className="toolbar-form">
      <input type="hidden" name="view" value={view} />
      {view === "week" ? <input type="hidden" name="weekStart" value={weekStart} /> : <input type="hidden" name="date" value={activityDate} />}
      <label>
        Team Filter
        <select name="team" defaultValue={team} onChange={submitOnChange}>
          <option value="all">All Teams</option>
          <option value="expansion">Expansion</option>
          <option value="new_logo">New Logo</option>
        </select>
      </label>
      <label>
        Sub Team Drilldown
        <select name="subTeam" defaultValue={subTeam} onChange={submitOnChange}>
          <option value="all">All Sub Teams</option>
          {subTeamOptions.map((value) => (
            <option key={value} value={value}>
              {labelForSubTeam(value)}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
