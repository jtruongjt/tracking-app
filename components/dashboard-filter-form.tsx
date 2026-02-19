"use client";

import { useRef } from "react";
import { Team } from "@/lib/types";

type Props = {
  month: string;
  team: Team | "all";
};

export function DashboardFilterForm({ month, team }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <form method="GET">
      <label>
        Live Month
        <div onClick={openPicker} style={{ cursor: "pointer" }}>
          <input ref={inputRef} type="month" name="month" defaultValue={month} />
        </div>
      </label>
      <label>
        Team Filter
        <select name="team" defaultValue={team}>
          <option value="all">All Teams</option>
          <option value="expansion">Expansion</option>
          <option value="new_logo">New Logo</option>
        </select>
      </label>
      <button type="submit">Apply Filters</button>
    </form>
  );
}
