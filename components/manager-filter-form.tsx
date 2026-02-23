"use client";

import { useRef } from "react";
import { SubTeam } from "@/lib/types";

type Props = {
  weekStart: string;
  manager: SubTeam | "all";
  managerOptions: SubTeam[];
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

export function ManagerFilterForm({ weekStart, manager, managerOptions }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  function submitOnManagerChange() {
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} method="GET" className="toolbar-form">
      <input type="hidden" name="weekStart" value={weekStart} />
      <label>
        Manager
        <select name="manager" defaultValue={manager} onChange={submitOnManagerChange}>
          <option value="all">All Managers</option>
          {managerOptions.map((subTeam) => (
            <option key={subTeam} value={subTeam}>
              {labelForSubTeam(subTeam)}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
