"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SubTeam, Team } from "@/lib/types";

type RepOption = {
  id: string;
  name: string;
  team: Team;
  sub_team: SubTeam;
};

function labelForSubTeam(subTeam: SubTeam): string {
  if (subTeam === "team_lucy") return "Team Lucy";
  if (subTeam === "team_ryan") return "Team Ryan";
  if (subTeam === "team_justin") return "Team Justin";
  return "Team Kyra";
}

type TotalEntry = {
  rep_id: string;
  tqr_actual: number;
  nl_actual: number | null;
  updated_at: string;
};

function labelForTeam(team: Team | "all"): string {
  if (team === "new_logo") return "New Logo";
  if (team === "expansion") return "Expansion";
  return "All Teams";
}

function formatLastUpdated(value?: string): string {
  if (!value) return "No update yet this month.";
  return new Date(value).toLocaleString();
}

export function UpdateForm({ month, reps, totals }: { month: string; reps: RepOption[]; totals: TotalEntry[] }) {
  const router = useRouter();
  const [teamFilter, setTeamFilter] = useState<Team | "all">("all");
  const [subTeamFilter, setSubTeamFilter] = useState<SubTeam | "all">("all");
  const [repId, setRepId] = useState("");
  const [tqr, setTqr] = useState("0");
  const [nl, setNl] = useState("0");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const totalsByRep = useMemo(() => new Map(totals.map((t) => [t.rep_id, t])), [totals]);
  const filteredReps = useMemo(() => {
    return reps.filter((rep) => {
      if (teamFilter !== "all" && rep.team !== teamFilter) return false;
      if (subTeamFilter !== "all" && rep.sub_team !== subTeamFilter) return false;
      return true;
    });
  }, [reps, teamFilter, subTeamFilter]);

  const selectedRep = useMemo(() => filteredReps.find((r) => r.id === repId), [repId, filteredReps]);
  const requiresNl = selectedRep?.team === "new_logo";
  const selectedTotal = selectedRep ? totalsByRep.get(selectedRep.id) : undefined;

  const subTeamOptions = useMemo(() => {
    if (teamFilter === "expansion") return (["all", "team_lucy", "team_ryan"] as const);
    if (teamFilter === "new_logo") return (["all", "team_justin", "team_kyra"] as const);
    return (["all", "team_lucy", "team_ryan", "team_justin", "team_kyra"] as const);
  }, [teamFilter]);

  useEffect(() => {
    if (!filteredReps.length || repId === "") {
      setRepId("");
      return;
    }
    const stillVisible = filteredReps.some((rep) => rep.id === repId);
    if (!stillVisible) {
      setRepId(filteredReps[0].id);
    }
  }, [filteredReps, repId]);

  useEffect(() => {
    if (!selectedRep) {
      setTqr("0");
      setNl("0");
      return;
    }
    const existing = totalsByRep.get(selectedRep.id);
    setTqr(String(existing?.tqr_actual ?? 0));
    if (selectedRep.team === "new_logo") {
      setNl(String(existing?.nl_actual ?? 0));
    } else {
      setNl("0");
    }
  }, [selectedRep, totalsByRep]);

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

    const tqrValue = Number(tqr);
    if (!Number.isFinite(tqrValue) || tqrValue < 0) {
      setErrorMessage("TQR must be a non-negative number.");
      return;
    }

    let nlValue: number | null = null;
    if (requiresNl) {
      nlValue = Number(nl);
      if (!Number.isFinite(nlValue) || nlValue < 0) {
        setErrorMessage("New Logo must be a non-negative number.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        repId: selectedRep.id,
        month,
        tqrActual: tqrValue,
        nlActual: nlValue
      };
      const response = await fetch("/api/update-totals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await response.json();
      if (!response.ok) {
        setErrorMessage(body.error ?? "Failed to update totals.");
        return;
      }
      setSuccessMessage("Totals saved.");
      setTeamFilter("all");
      setSubTeamFilter("all");
      setRepId("");
      setTqr("0");
      setNl("0");
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
        TQR Current Total
        <input type="number" min={0} step="any" value={tqr} onChange={(e) => setTqr(e.target.value)} required />
      </label>

      {requiresNl ? (
        <label>
          New Logo Current Total
          <input type="number" min={0} step="any" value={nl} onChange={(e) => setNl(e.target.value)} required />
        </label>
      ) : null}

      <p className="muted">Last updated: {formatLastUpdated(selectedTotal?.updated_at)}</p>

      <button type="submit" disabled={loading || !selectedRep}>{loading ? "Saving..." : "Save Totals"}</button>
      {successMessage ? <p className="notice notice-success">{successMessage}</p> : null}
      {errorMessage ? <p className="notice notice-error">{errorMessage}</p> : null}
    </form>
  );
}
