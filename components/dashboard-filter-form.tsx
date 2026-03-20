"use client";

import { useRef } from "react";
import { labelForSubTeam, teamForSubTeam } from "@/lib/teams";
import { SubTeam, Team } from "@/lib/types";

type Props = {
  month: string;
  team: Team | "all";
  subTeam: SubTeam | "all";
  subTeamOptions: SubTeam[];
};

export function DashboardFilterForm({ month, team, subTeam, subTeamOptions }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const teamRef = useRef<HTMLSelectElement>(null);
  const subTeamRef = useRef<HTMLSelectElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.focus();
    input.click();
  }

  function submitOnMonthChange() {
    formRef.current?.requestSubmit();
  }

  function syncSubTeamForTeamChange() {
    if (subTeamRef.current) {
      subTeamRef.current.value = "all";
    }

    formRef.current?.requestSubmit();
  }

  function syncTeamForSubTeamChange() {
    const nextSubTeam = subTeamRef.current?.value as SubTeam | "all" | undefined;
    if (nextSubTeam && nextSubTeam !== "all" && teamRef.current) {
      teamRef.current.value = teamForSubTeam(nextSubTeam);
    }

    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="GET" className="toolbar-form">
      <label>
        Live Month
        <div onClick={openPicker} className="toolbar-picker-hitbox">
          <input ref={inputRef} type="month" name="month" defaultValue={month} onChange={submitOnMonthChange} />
        </div>
      </label>
      <label>
        Team Filter
        <select ref={teamRef} name="team" defaultValue={team} onChange={syncSubTeamForTeamChange}>
          <option value="all">All Teams</option>
          <option value="expansion">Expansion</option>
          <option value="new_logo">New Logo</option>
        </select>
      </label>
      <label>
        Sub Team Filter
        <select ref={subTeamRef} name="subTeam" defaultValue={subTeam} onChange={syncTeamForSubTeamChange}>
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
