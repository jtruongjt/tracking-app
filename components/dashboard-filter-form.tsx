"use client";

import { useRef } from "react";
import { Team } from "@/lib/types";

type Props = {
  month: string;
  team: Team | "all";
};

export function DashboardFilterForm({ month, team }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
