"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DailyActivityExemptionStatus, SubTeam, Team } from "@/lib/types";

type RepRow = {
  id: string;
  name: string;
  team: Team;
  sub_team: SubTeam;
};

type ActivityRow = {
  rep_id: string;
  activity_date: string;
  sdr_events: number;
  events_created: number;
  events_held: number;
};

type ExemptionRow = {
  rep_id: string;
  activity_date: string;
  status: DailyActivityExemptionStatus;
};

type Props = {
  reps: RepRow[];
  weekDates: string[];
  activities: ActivityRow[];
  exemptions: ExemptionRow[];
  todayDateKey: string;
};

type CellExemptionValue = "none" | DailyActivityExemptionStatus;

function formatDayHeader(dateKey: string): { label: string; subLabel: string } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return {
    label: date.toLocaleDateString("en-US", { weekday: "short" }),
    subLabel: date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })
  };
}

function labelForSubTeam(subTeam: SubTeam): string {
  if (subTeam === "team_lucy") return "Team Lucy";
  if (subTeam === "team_ryan") return "Team Ryan";
  if (subTeam === "team_mike") return "Team Mike";
  if (subTeam === "team_bridger") return "Team Bridger";
  if (subTeam === "team_justin") return "Team Justin";
  if (subTeam === "team_sydney") return "Team Sydney";
  return "Team Kyra";
}

function labelForExemption(status: DailyActivityExemptionStatus): string {
  if (status === "pto") return "PTO";
  if (status === "ooo") return "OOO";
  return "Holiday";
}

function cellKey(repId: string, dateKey: string): string {
  return `${repId}:${dateKey}`;
}

export function ManagerWeekGrid({ reps, weekDates, activities, exemptions, todayDateKey }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, CellExemptionValue>>({});
  const [bulkRepPtoDrafts, setBulkRepPtoDrafts] = useState<Record<string, boolean>>({});
  const [pendingExemptionCell, setPendingExemptionCell] = useState<string | null>(null);
  const [pendingActivityCell, setPendingActivityCell] = useState<string | null>(null);
  const [pendingBulkRepId, setPendingBulkRepId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activityByCell = useMemo(() => {
    const map = new Map<string, ActivityRow>();
    for (const row of activities) {
      map.set(cellKey(row.rep_id, row.activity_date), row);
    }
    return map;
  }, [activities]);

  const exemptionByCell = useMemo(() => {
    const map = new Map<string, DailyActivityExemptionStatus>();
    for (const row of exemptions) {
      map.set(cellKey(row.rep_id, row.activity_date), row.status);
    }
    return map;
  }, [exemptions]);

  const groupedReps = useMemo(() => {
    const order: SubTeam[] = ["team_lucy", "team_ryan", "team_mike", "team_bridger", "team_justin", "team_kyra", "team_sydney"];
    return order
      .map((subTeam) => ({
        subTeam,
        reps: reps
          .filter((rep) => rep.sub_team === subTeam)
          .sort((a, b) => a.name.localeCompare(b.name))
      }))
      .filter((group) => group.reps.length > 0);
  }, [reps]);

  function getDraftValue(repId: string, dateKey: string): CellExemptionValue {
    const key = cellKey(repId, dateKey);
    if (drafts[key]) return drafts[key];
    return exemptionByCell.get(key) ?? "none";
  }

  async function saveExemption(repId: string, dateKey: string) {
    const key = cellKey(repId, dateKey);
    const status = getDraftValue(repId, dateKey);
    setPendingExemptionCell(key);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/update-activity-exemption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repId, activityDate: dateKey, status })
      });
      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.error ?? "Failed to save exemption.");
        return;
      }
      setSuccessMessage("Status updated.");
      router.refresh();
    } catch {
      setErrorMessage("Unexpected error. Try again.");
    } finally {
      setPendingExemptionCell(null);
    }
  }

  async function saveActivity(event: React.FormEvent<HTMLFormElement>, repId: string, dateKey: string) {
    event.preventDefault();
    const key = cellKey(repId, dateKey);
    const formData = new FormData(event.currentTarget);
    const sdrEvents = Number(formData.get("sdrEvents") ?? 0);
    const eventsCreated = Number(formData.get("eventsCreated") ?? 0);
    const eventsHeld = Number(formData.get("eventsHeld") ?? 0);

    if (!Number.isInteger(sdrEvents) || sdrEvents < 0 || !Number.isInteger(eventsCreated) || eventsCreated < 0 || !Number.isInteger(eventsHeld) || eventsHeld < 0) {
      setErrorMessage("Activity values must be non-negative integers.");
      setSuccessMessage(null);
      return;
    }

    setPendingActivityCell(key);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/update-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repId,
          activityDate: dateKey,
          sdrEvents,
          eventsCreated,
          eventsHeld
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.error ?? "Failed to save activity.");
        return;
      }
      setSuccessMessage("Activity saved.");
      router.refresh();
    } catch {
      setErrorMessage("Unexpected error. Try again.");
    } finally {
      setPendingActivityCell(null);
    }
  }

  async function saveBulkWeekExemption(repId: string) {
    const status: CellExemptionValue = (bulkRepPtoDrafts[repId] ?? false) ? "pto" : "none";
    setPendingBulkRepId(repId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const responses = await Promise.all(
        weekDates.map(async (dateKey) => {
          const response = await fetch("/api/update-activity-exemption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repId, activityDate: dateKey, status })
          });
          const body = await response.json();
          return { ok: response.ok, error: body.error as string | undefined };
        })
      );

      const failed = responses.find((item) => !item.ok);
      if (failed) {
        setErrorMessage(failed.error ?? "Failed to save bulk week status.");
        return;
      }

      setSuccessMessage(status === "none" ? "Week PTO cleared." : "Week marked PTO.");
      router.refresh();
    } catch {
      setErrorMessage("Unexpected error. Try again.");
    } finally {
      setPendingBulkRepId(null);
    }
  }

  const weekdayHeaders = weekDates.map(formatDayHeader);

  return (
    <div className="grid">
      {successMessage ? <p className="notice notice-success">{successMessage}</p> : null}
      {errorMessage ? <p className="notice notice-error">{errorMessage}</p> : null}

      {groupedReps.map((group) => (
        <section key={group.subTeam} className="card manager-grid-card">
          <h3>{labelForSubTeam(group.subTeam)}</h3>
          <div className="table-wrap">
            <table className="table table-striped table-compact manager-grid-table">
              <thead>
                <tr>
                  <th>Rep</th>
                  {weekdayHeaders.map((header, index) => (
                    <th key={weekDates[index]}>
                      <div>{header.label}</div>
                      <div className="manager-day-subhead">{header.subLabel}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.reps.map((rep) => (
                  <tr key={rep.id}>
                    <td className="manager-rep-cell">
                      <div className="manager-rep-cell-wrap">
                        <div>{rep.name}</div>
                        <div className="manager-rep-bulk">
                          <label className="manager-pto-toggle">
                            <input
                              type="checkbox"
                              checked={bulkRepPtoDrafts[rep.id] ?? false}
                              onChange={(e) =>
                                setBulkRepPtoDrafts((prev) => ({
                                  ...prev,
                                  [rep.id]: e.target.checked
                                }))
                              }
                              disabled={pendingBulkRepId === rep.id}
                            />
                            <span>PTO all week</span>
                          </label>
                          <button
                            type="button"
                            className="nav-toggle-link manager-rep-bulk-save"
                            onClick={() => saveBulkWeekExemption(rep.id)}
                            disabled={pendingBulkRepId === rep.id}
                          >
                            {pendingBulkRepId === rep.id ? "..." : "Save Week"}
                          </button>
                        </div>
                      </div>
                    </td>
                    {weekDates.map((dateKey) => {
                      const key = cellKey(rep.id, dateKey);
                      const activity = activityByCell.get(key);
                      const savedExemption = exemptionByCell.get(key);
                      const draftValue = getDraftValue(rep.id, dateKey);
                      const isFuture = dateKey > todayDateKey;
                      const isExemptionPending = pendingExemptionCell === key;
                      const isActivityPending = pendingActivityCell === key;

                      let badgeClass = "badge-missing";
                      let badgeLabel = "Missing";
                      if (savedExemption) {
                        badgeClass = savedExemption === "holiday" ? "badge-partial" : "badge-info";
                        badgeLabel = labelForExemption(savedExemption);
                      } else if (activity) {
                        badgeClass = "badge-submitted";
                        badgeLabel = "Submitted";
                      } else if (isFuture) {
                        badgeClass = "badge-upcoming";
                        badgeLabel = "Upcoming";
                      }

                      return (
                        <td key={dateKey}>
                          <div className={`manager-cell ${!activity && !savedExemption && !isFuture ? "manager-cell-missing" : ""}`}>
                            <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                            {activity ? (
                              <div className="manager-cell-metrics">
                                <span>S {activity.sdr_events}</span>
                                <span>C {activity.events_created}</span>
                                <span>H {activity.events_held}</span>
                              </div>
                            ) : null}
                            <>
                              {!isFuture ? (
                                <details className="manager-cell-editor">
                                  <summary>{activity ? "Quick edit activity" : "Add activity"}</summary>
                                  <form className="manager-activity-form" onSubmit={(event) => saveActivity(event, rep.id, dateKey)}>
                                    <div className="manager-activity-inputs">
                                      <label>
                                        <span>S</span>
                                        <input
                                          type="number"
                                          name="sdrEvents"
                                          min={0}
                                          step={1}
                                          defaultValue={activity?.sdr_events ?? 0}
                                          disabled={isActivityPending}
                                          required
                                        />
                                      </label>
                                      <label>
                                        <span>C</span>
                                        <input
                                          type="number"
                                          name="eventsCreated"
                                          min={0}
                                          step={1}
                                          defaultValue={activity?.events_created ?? 0}
                                          disabled={isActivityPending}
                                          required
                                        />
                                      </label>
                                      <label>
                                        <span>H</span>
                                        <input
                                          type="number"
                                          name="eventsHeld"
                                          min={0}
                                          step={1}
                                          defaultValue={activity?.events_held ?? 0}
                                          disabled={isActivityPending}
                                          required
                                        />
                                      </label>
                                    </div>
                                    <button type="submit" className="nav-toggle-link manager-activity-save" disabled={isActivityPending}>
                                      {isActivityPending ? "Saving..." : "Save Activity"}
                                    </button>
                                  </form>
                                </details>
                              ) : null}

                              <div className="manager-cell-actions">
                                <label className="manager-pto-toggle">
                                  <input
                                    type="checkbox"
                                    checked={draftValue === "pto"}
                                    onChange={(e) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [key]: e.target.checked ? "pto" : "none"
                                      }))
                                    }
                                    disabled={isExemptionPending}
                                  />
                                  <span>PTO</span>
                                </label>
                                <button type="button" className="nav-toggle-link manager-cell-save" onClick={() => saveExemption(rep.id, dateKey)} disabled={isExemptionPending}>
                                  {isExemptionPending ? "..." : "Save"}
                                </button>
                              </div>
                            </>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
