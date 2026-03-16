import Link from "next/link";
import { notFound } from "next/navigation";
import { dateKeyToDate, getCurrentMonthKey, getWeekStartKey, normalizeMonthParam, toDateLabel, toMonthLabel, toWeekLabel } from "@/lib/date";
import { getRepActivityHistory, getRepById, getRepPerformanceHistory } from "@/lib/data";
import { isDailyActivityEnabled } from "@/lib/features";
import { formatCurrency, formatPercent, formatScorePercent } from "@/lib/scoring";
import { DailyActivityExemptionStatus, RepActivityHistoryRow, SubTeam } from "@/lib/types";
import { PaceBadge } from "@/components/pace-badge";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{
    repId: string;
  }>;
  searchParams?: Promise<{
    month?: string | string[];
  }>;
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

function labelForExemptionStatus(status: DailyActivityExemptionStatus): string {
  if (status === "pto") return "PTO";
  if (status === "ooo") return "OOO";
  return "Holiday";
}

function getRecentWindow(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
  const toDateKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return {
    startDate: toDateKey(start),
    endDate: toDateKey(end)
  };
}

function summarizeActivityRows(rows: RepActivityHistoryRow[]) {
  return rows.reduce(
    (acc, row) => {
      acc.sdrEvents += row.sdr_events;
      acc.eventsCreated += row.events_created;
      acc.eventsHeld += row.events_held;
      if (row.exemption_status) acc.exemptDays += 1;
      if (row.updated_at) acc.submittedDays += 1;
      return acc;
    },
    { sdrEvents: 0, eventsCreated: 0, eventsHeld: 0, exemptDays: 0, submittedDays: 0 }
  );
}

function groupActivityRowsByWeek(rows: RepActivityHistoryRow[]) {
  const groups: Array<{
    weekStart: string;
    rows: RepActivityHistoryRow[];
    summary: {
      sdrEvents: number;
      eventsCreated: number;
      eventsHeld: number;
      submittedDays: number;
      exemptDays: number;
    };
  }> = [];

  for (const row of rows) {
    const weekStart = getWeekStartKey(dateKeyToDate(row.activity_date));
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.weekStart !== weekStart) {
      groups.push({
        weekStart,
        rows: [row],
        summary: {
          sdrEvents: row.sdr_events,
          eventsCreated: row.events_created,
          eventsHeld: row.events_held,
          submittedDays: row.updated_at ? 1 : 0,
          exemptDays: row.exemption_status ? 1 : 0
        }
      });
      continue;
    }

    currentGroup.rows.push(row);
    currentGroup.summary.sdrEvents += row.sdr_events;
    currentGroup.summary.eventsCreated += row.events_created;
    currentGroup.summary.eventsHeld += row.events_held;
    currentGroup.summary.submittedDays += row.updated_at ? 1 : 0;
    currentGroup.summary.exemptDays += row.exemption_status ? 1 : 0;
  }

  return groups;
}

export default async function RepProfilePage({ params, searchParams }: Props) {
  const { repId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedMonth = normalizeMonthParam(resolvedSearchParams?.month) ?? getCurrentMonthKey();
  const rep = await getRepById(repId);

  if (!rep) {
    notFound();
  }

  const recentWindow = getRecentWindow();
  const [performanceHistory, activityHistory] = await Promise.all([
    getRepPerformanceHistory(rep),
    isDailyActivityEnabled() ? getRepActivityHistory(rep.id, recentWindow.startDate, recentWindow.endDate) : Promise.resolve([])
  ]);

  const selectedPerformance =
    performanceHistory.find((row) => row.month === selectedMonth) ??
    performanceHistory[0] ?? {
      month: selectedMonth,
      tqrTarget: 0,
      tqrActual: 0,
      tqrAttainment: 0,
      nlTarget: null,
      nlActual: null,
      nlAttainment: null,
      weightedScore: 0,
      paceStatus: "on_track" as const
    };
  const activitySummary = summarizeActivityRows(activityHistory);
  const weeklyActivityGroups = groupActivityRowsByWeek(activityHistory);

  return (
    <div className="grid">
      <section className="card toolbar-card">
        <div className="rep-profile-header">
          <div>
            <h2>{rep.name}</h2>
            <p className="muted">
              {rep.team === "expansion" ? "Expansion" : "New Logo"} · {labelForSubTeam(rep.sub_team)}
            </p>
          </div>
          <PaceBadge status={selectedPerformance.paceStatus} />
        </div>
        <div className="toolbar-switches">
          <Link className="button-link" href={`/update?month=${selectedPerformance.month}&repId=${rep.id}`}>
            Edit Performance
          </Link>
          {isDailyActivityEnabled() ? (
            <Link className="nav-toggle-link" href={`/activity/update?repId=${rep.id}`}>
              Edit Activity
            </Link>
          ) : null}
        </div>
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <h3>Selected Month</h3>
          <p className="kpi-value">{toMonthLabel(selectedPerformance.month)}</p>
          <p className="kpi-note">Monthly performance snapshot</p>
        </article>
        <article className="kpi-card">
          <h3>TQR</h3>
          <p className="kpi-value">{formatCurrency(selectedPerformance.tqrActual)}</p>
          <p className="kpi-note">
            Target {formatCurrency(selectedPerformance.tqrTarget)} · {formatPercent(selectedPerformance.tqrAttainment)}
          </p>
        </article>
        {rep.team === "new_logo" ? (
          <article className="kpi-card">
            <h3>New Logos</h3>
            <p className="kpi-value">{(selectedPerformance.nlActual ?? 0).toLocaleString()}</p>
            <p className="kpi-note">
              Target {(selectedPerformance.nlTarget ?? 0).toLocaleString()} · {formatPercent(selectedPerformance.nlAttainment ?? 0)}
            </p>
          </article>
        ) : null}
        <article className="kpi-card">
          <h3>Weighted Score</h3>
          <p className={`kpi-value kpi-status-${selectedPerformance.paceStatus}`}>{formatScorePercent(selectedPerformance.weightedScore)}</p>
          <p className="kpi-note">Based on current team scoring rules</p>
        </article>
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h3>Performance History</h3>
          <p className="muted">Month-over-month totals already stored in the app.</p>
          <div className="table-wrap">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Month</th>
                  <th className="num">TQR</th>
                  {rep.team === "new_logo" ? <th className="num">NL</th> : null}
                  <th className="num">Weighted</th>
                  <th>Pace</th>
                </tr>
              </thead>
              <tbody>
                {performanceHistory.length === 0 ? (
                  <tr>
                    <td colSpan={rep.team === "new_logo" ? 5 : 4} className="muted">No monthly history found yet.</td>
                  </tr>
                ) : (
                  performanceHistory.map((row) => (
                    <tr key={row.month}>
                      <td>
                        <Link className="table-link-inherit" href={`/reps/${rep.id}?month=${row.month}`}>
                          {toMonthLabel(row.month)}
                        </Link>
                      </td>
                      <td className="num">{formatCurrency(row.tqrActual)} / {formatCurrency(row.tqrTarget)}</td>
                      {rep.team === "new_logo" ? (
                        <td className="num">
                          {row.nlTarget === null ? "N/A" : `${(row.nlActual ?? 0).toLocaleString()} / ${row.nlTarget.toLocaleString()}`}
                        </td>
                      ) : null}
                      <td className="num">{formatScorePercent(row.weightedScore)}</td>
                      <td><PaceBadge status={row.paceStatus} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card">
          <h3>Recent Activity</h3>
          <p className="muted">Last 30 days of submissions and exemptions.</p>
          <section className="kpi-grid rep-profile-kpis">
            <article className="kpi-card">
              <h3>Submitted Days</h3>
              <p className="kpi-value">{activitySummary.submittedDays}</p>
              <p className="kpi-note">Last 30 days</p>
            </article>
            <article className="kpi-card">
              <h3>Exempt Days</h3>
              <p className="kpi-value">{activitySummary.exemptDays}</p>
              <p className="kpi-note">PTO, OOO, Holiday</p>
            </article>
            <article className="kpi-card">
              <h3>Created + Held</h3>
              <p className="kpi-value">{(activitySummary.eventsCreated + activitySummary.eventsHeld).toLocaleString()}</p>
              <p className="kpi-note">Combined activity volume</p>
            </article>
          </section>
          {isDailyActivityEnabled() ? (
            weeklyActivityGroups.length === 0 ? (
              <p className="muted">No recent activity found yet.</p>
            ) : (
              <div className="rep-activity-weeks">
                {weeklyActivityGroups.map((group) => (
                  <section key={group.weekStart} className="rep-activity-week">
                    <div className="rep-activity-week-header">
                      <div>
                        <h4>{toWeekLabel(group.weekStart)}</h4>
                        <p className="muted">{group.rows.length} entries for this week</p>
                      </div>
                      <div className="rep-activity-week-subtotals">
                        <span>Submitted: {group.summary.submittedDays}</span>
                        <span>Exempt: {group.summary.exemptDays}</span>
                        <span>SDR: {group.summary.sdrEvents.toLocaleString()}</span>
                        <span>Created: {group.summary.eventsCreated.toLocaleString()}</span>
                        <span>Held: {group.summary.eventsHeld.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table className="table table-striped table-compact">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th className="num">SDR</th>
                            <th className="num">Created</th>
                            <th className="num">Held</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => (
                            <tr key={row.activity_date}>
                              <td>{toDateLabel(row.activity_date)}</td>
                              <td>
                                {row.exemption_status ? (
                                  <span className="badge badge-info">{labelForExemptionStatus(row.exemption_status)}</span>
                                ) : row.updated_at ? (
                                  <span className="badge badge-submitted">Submitted</span>
                                ) : (
                                  <span className="badge badge-upcoming">No entry</span>
                                )}
                              </td>
                              <td className="num">{row.sdr_events}</td>
                              <td className="num">{row.events_created}</td>
                              <td className="num">{row.events_held}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            )
          ) : (
            <p className="muted">Daily activity tracking is disabled in this environment.</p>
          )}
        </section>
      </div>
    </div>
  );
}
