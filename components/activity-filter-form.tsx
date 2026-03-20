"use client";

import { useRef } from "react";
import { labelForSubTeam, teamForSubTeam } from "@/lib/teams";
import { SubTeam, Team } from "@/lib/types";

type Props = {
  view: "day" | "week";
  activityDate: string;
  weekStart: string;
  team: Team | "all";
  subTeam: SubTeam | "all";
  subTeamOptions: SubTeam[];
};

export function ActivityFilterForm({
  view,
  activityDate,
  weekStart,
  team,
  subTeam,
  subTeamOptions
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const teamRef = useRef<HTMLSelectElement>(null);
  const subTeamRef = useRef<HTMLSelectElement>(null);

  function submitOnChange() {
    formRef.current?.requestSubmit();
  }

  function submitForTeamChange() {
    const nextTeam = teamRef.current?.value as Team | "all" | undefined;
    const currentSubTeam = subTeamRef.current?.value as SubTeam | "all" | undefined;

    if (nextTeam && nextTeam !== "all" && currentSubTeam && currentSubTeam !== "all" && teamForSubTeam(currentSubTeam) !== nextTeam) {
      subTeamRef.current!.value = "all";
    }

    submitOnChange();
  }

  function submitForSubTeamChange() {
    const nextSubTeam = subTeamRef.current?.value as SubTeam | "all" | undefined;
    if (nextSubTeam && nextSubTeam !== "all" && teamRef.current) {
      teamRef.current.value = teamForSubTeam(nextSubTeam);
    }

    submitOnChange();
  }

  return (
    <form ref={formRef} method="GET" className="toolbar-form">
      <input type="hidden" name="view" value={view} />
      {view === "week" ? <input type="hidden" name="weekStart" value={weekStart} /> : <input type="hidden" name="date" value={activityDate} />}
      <label>
        Team Filter
        <select ref={teamRef} name="team" defaultValue={team} onChange={submitForTeamChange}>
          <option value="all">All Teams</option>
          <option value="expansion">Expansion</option>
          <option value="new_logo">New Logo</option>
        </select>
      </label>
      <label>
        Sub Team Drilldown
        <select ref={subTeamRef} name="subTeam" defaultValue={subTeam} onChange={submitForSubTeamChange}>
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
