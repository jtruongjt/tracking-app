"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DailyActivity, SubTeam, Team } from "@/lib/types";

type RepOption = {
  id: string;
  name: string;
  team: Team;
  sub_team: SubTeam;
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

function labelForTeam(team: Team | "all"): string {
  if (team === "new_logo") return "New Logo";
  if (team === "expansion") return "Expansion";
  return "All Teams";
}

type ActivityByRep = Pick<DailyActivity, "rep_id" | "sdr_events" | "events_created" | "events_held" | "notes">;

export function ActivityForm({
  activityDate,
  reps,
  activities,
  initialRepId
}: {
  activityDate: string;
  reps: RepOption[];
  activities: ActivityByRep[];
  initialRepId?: string;
}) {
  const router = useRouter();
  const [teamFilter, setTeamFilter] = useState<Team | "all">("all");
  const [subTeamFilter, setSubTeamFilter] = useState<SubTeam | "all">("all");
  const [repId, setRepId] = useState(initialRepId ?? "");
  const [sdrEvents, setSdrEvents] = useState("0");
  const [eventsCreated, setEventsCreated] = useState("0");
  const [eventsHeld, setEventsHeld] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const activityByRep = useMemo(() => new Map(activities.map((item) => [item.rep_id, item])), [activities]);

  const filteredReps = useMemo(() => {
    return reps.filter((rep) => {
      if (teamFilter !== "all" && rep.team !== teamFilter) return false;
      if (subTeamFilter !== "all" && rep.sub_team !== subTeamFilter) return false;
      return true;
    });
  }, [reps, teamFilter, subTeamFilter]);

  const selectedRep = useMemo(() => filteredReps.find((rep) => rep.id === repId), [filteredReps, repId]);

  const subTeamOptions = useMemo(() => {
    if (teamFilter === "expansion") return (["all", "team_lucy", "team_ryan", "team_mike", "team_bridger"] as const);
    if (teamFilter === "new_logo") return (["all", "team_justin", "team_kyra", "team_sydney"] as const);
    return (["all", "team_lucy", "team_ryan", "team_mike", "team_bridger", "team_justin", "team_kyra", "team_sydney"] as const);
  }, [teamFilter]);

  useEffect(() => {
    if (!initialRepId) return;
    const exists = reps.some((rep) => rep.id === initialRepId);
    if (exists) setRepId(initialRepId);
  }, [initialRepId, reps]);

  useEffect(() => {
    if (!filteredReps.length || repId === "") {
      setRepId("");
      return;
    }
    const stillVisible = filteredReps.some((rep) => rep.id === repId);
    if (!stillVisible) setRepId(filteredReps[0].id);
  }, [filteredReps, repId]);

  useEffect(() => {
    if (!selectedRep) {
      setSdrEvents("0");
      setEventsCreated("0");
      setEventsHeld("0");
      setNotes("");
      return;
    }
    const existing = activityByRep.get(selectedRep.id);
    setSdrEvents(String(existing?.sdr_events ?? 0));
    setEventsCreated(String(existing?.events_created ?? 0));
    setEventsHeld(String(existing?.events_held ?? 0));
    setNotes(existing?.notes ?? "");
  }, [selectedRep, activityByRep]);

  useEffect(() => {
    if (!successMessage) return;
    const timer = window.setTimeout(() => setSuccessMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedRep) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const sdrValue = Number(sdrEvents);
    const createdValue = Number(eventsCreated);
    const heldValue = Number(eventsHeld);

    if (!Number.isInteger(sdrValue) || sdrValue < 0) {
      setErrorMessage("SDR events must be a non-negative integer.");
      return;
    }
    if (!Number.isInteger(createdValue) || createdValue < 0) {
      setErrorMessage("Events created must be a non-negative integer.");
      return;
    }
    if (!Number.isInteger(heldValue) || heldValue < 0) {
      setErrorMessage("Events held must be a non-negative integer.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/update-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repId: selectedRep.id,
          activityDate,
          sdrEvents: sdrValue,
          eventsCreated: createdValue,
          eventsHeld: heldValue,
          notes
        })
      });
      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.error ?? "Failed to save daily activity.");
        return;
      }

      setSuccessMessage("Daily activity saved.");
      router.refresh();
    } catch {
      setErrorMessage("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <label>
        Team Filter
        <select
          value={teamFilter}
          onChange={(e) => {
            const value = e.target.value as Team | "all";
            setTeamFilter(value);
            setSubTeamFilter("all");
          }}
        >
          <option value="all">All Teams</option>
          <option value="expansion">Expansion</option>
          <option value="new_logo">New Logo</option>
        </select>
      </label>

      <label>
        Sub Team Filter
        <select value={subTeamFilter} onChange={(e) => setSubTeamFilter(e.target.value as SubTeam | "all")}>
          {subTeamOptions.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All Sub Teams" : labelForSubTeam(option)}
            </option>
          ))}
        </select>
      </label>

      <label>
        Rep
        <select value={repId} onChange={(e) => setRepId(e.target.value)} disabled={!filteredReps.length}>
          <option value="">Select a rep</option>
          {filteredReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name} ({labelForTeam(rep.team)} - {labelForSubTeam(rep.sub_team)})
            </option>
          ))}
        </select>
      </label>

      <label>
        SDR Events
        <input
          type="number"
          min={0}
          step={1}
          value={sdrEvents}
          onChange={(e) => setSdrEvents(e.target.value)}
          required
        />
      </label>

      <label>
        Events Created
        <input
          type="number"
          min={0}
          step={1}
          value={eventsCreated}
          onChange={(e) => setEventsCreated(e.target.value)}
          required
        />
      </label>

      <label>
        Events Held
        <input
          type="number"
          min={0}
          step={1}
          value={eventsHeld}
          onChange={(e) => setEventsHeld(e.target.value)}
          required
        />
      </label>

      <label>
        Notes (optional)
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={240} />
      </label>

      <button type="submit" disabled={loading || !selectedRep}>{loading ? "Saving..." : "Submit"}</button>
      {successMessage ? <p className="notice notice-success">{successMessage}</p> : null}
      {errorMessage ? <p className="notice notice-error">{errorMessage}</p> : null}
    </form>
  );
}
