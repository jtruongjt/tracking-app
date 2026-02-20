import { getCurrentMonthKey, normalizeMonthParam, toMonthLabel } from "@/lib/date";
import { getDashboardData } from "@/lib/data";
import { formatCurrency, formatPercent, formatScorePercent } from "@/lib/scoring";
import { PaceBadge } from "@/components/pace-badge";
import { DashboardFilterForm } from "@/components/dashboard-filter-form";
import { DashboardRow, SubTeam, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?:
    | {
        month?: string | string[];
        team?: string | string[];
      }
    | Promise<{
        month?: string | string[];
        team?: string | string[];
      }>;
};

function normalizeTeamParam(value?: string | string[]): Team | "all" {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "expansion" || raw === "new_logo") return raw;
  return "all";
}

function subTeamLabel(subTeam: SubTeam): string {
  if (subTeam === "team_lucy") return "Team Lucy";
  if (subTeam === "team_ryan") return "Team Ryan";
  if (subTeam === "team_mike") return "Team Mike";
  if (subTeam === "team_bridger") return "Team Bridger";
  if (subTeam === "team_justin") return "Team Justin";
  if (subTeam === "team_sydney") return "Team Sydney";
  return "Team Kyra";
}

function filterBySubTeam(rows: DashboardRow[], subTeam: SubTeam): DashboardRow[] {
  return rows.filter((row) => row.subTeam === subTeam);
}

function gapClass(gapValue: number): string {
  return gapValue > 0 ? "gap-behind" : "gap-on-track";
}

function renderCurrencyGap(gapValue: number): string {
  if (gapValue <= 0) return "On pace";
  return `${formatCurrency(gapValue)} behind`;
}

function renderScoreGap(gapValue: number): string {
  if (gapValue <= 0) return "On pace";
  return `${gapValue.toFixed(1)}% behind`;
}

export default async function DashboardPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const selectedMonth = normalizeMonthParam(resolvedSearchParams?.month);
  const teamFilter = normalizeTeamParam(resolvedSearchParams?.team);
  const month = selectedMonth ?? getCurrentMonthKey();
  const data = await getDashboardData(month);
  const rows = teamFilter === "all" ? data.rows : data.rows.filter((r) => r.team === teamFilter);
  const expansionRows = rows.filter((r) => r.team === "expansion");
  const newLogoRows = rows.filter((r) => r.team === "new_logo");
  const showExpansion = teamFilter === "all" || teamFilter === "expansion";
  const showNewLogo = teamFilter === "all" || teamFilter === "new_logo";
  const atRiskCount = rows.filter((row) => row.paceStatus === "at_risk").length;
  const behindCount = rows.filter((row) => row.paceStatus === "behind").length;
  const onTrackCount = rows.filter((row) => row.paceStatus === "on_track").length;
  const teamsLabel = teamFilter === "all" ? "All Teams" : teamFilter === "expansion" ? "Expansion" : "New Logo";

  return (
    <div className="grid">
      <div className="card toolbar-card">
        <h2>{toMonthLabel(month)} Dashboard</h2>
        <p className="muted">Scores: Expansion = TQR only. New Logo = 70% NL + 30% TQR.</p>
        <p className="muted">Use filters to view all teams or a single team.</p>
        <DashboardFilterForm month={month} team={teamFilter} />
      </div>

      <section className="kpi-grid">
        <article className="kpi-card">
          <h3>Reps in View</h3>
          <p className="kpi-value">{rows.length}</p>
          <p className="kpi-note">{teamsLabel}</p>
        </article>
        <article className="kpi-card">
          <h3>On Track Reps</h3>
          <p className="kpi-value kpi-status-on_track">{onTrackCount}</p>
          <p className="kpi-note">At risk: {atRiskCount}</p>
        </article>
        <article className="kpi-card">
          <h3>Behind Reps</h3>
          <p className="kpi-value kpi-status-behind">{behindCount}</p>
          <p className="kpi-note">Needs attention this month</p>
        </article>
        {showExpansion ? (
          <article className="kpi-card">
            <h3>Expansion TQR Attainment</h3>
            <p className="kpi-value">
              {formatPercent(data.rollup.expansion.tqrTarget > 0 ? data.rollup.expansion.tqrActual / data.rollup.expansion.tqrTarget : 0)}
            </p>
            <p className="kpi-note">{formatCurrency(data.rollup.expansion.tqrActual)} actual</p>
          </article>
        ) : null}
        {showNewLogo ? (
          <article className="kpi-card">
            <h3>New Logo Weighted Avg</h3>
            <p className="kpi-value">{formatScorePercent(data.rollup.newLogo.weightedAverage)}</p>
            <p className="kpi-note">NL + TQR blend</p>
          </article>
        ) : null}
      </section>

      <div className="grid grid-2">
        {showExpansion ? (
          <section className="card">
            <h3>Expansion Rollup</h3>
            <p>TQR: {formatCurrency(data.rollup.expansion.tqrActual)} / {formatCurrency(data.rollup.expansion.tqrTarget)}</p>
            <p>TQR Attainment: {formatPercent(data.rollup.expansion.tqrTarget > 0 ? data.rollup.expansion.tqrActual / data.rollup.expansion.tqrTarget : 0)}</p>
          </section>
        ) : null}
        {showNewLogo ? (
          <section className="card">
            <h3>New Logo Rollup</h3>
            <p>TQR: {formatCurrency(data.rollup.newLogo.tqrActual)} / {formatCurrency(data.rollup.newLogo.tqrTarget)}</p>
            <p>NL: {data.rollup.newLogo.nlActual.toLocaleString()} / {data.rollup.newLogo.nlTarget.toLocaleString()}</p>
            <p>Avg Weighted Score: {formatScorePercent(data.rollup.newLogo.weightedAverage)}</p>
          </section>
        ) : null}
      </div>

      {showExpansion ? (
        <section className="card">
          <h3>Expansion Tracking</h3>
          {(["team_lucy", "team_ryan", "team_mike", "team_bridger"] as SubTeam[]).map((subTeam) => {
            const rows = filterBySubTeam(expansionRows, subTeam);
            return (
              <div key={subTeam} style={{ marginTop: "1rem" }}>
                <h4>{subTeamLabel(subTeam)}</h4>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rep</th>
                        <th className="num">TQR</th>
                        <th className="num">TQR Attainment</th>
                        <th>Pace</th>
                        <th className="num">Gap to Pace</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="muted">No reps assigned.</td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.repId}>
                            <td>{row.repName}</td>
                            <td className="num">{formatCurrency(row.tqrActual)} / {formatCurrency(row.tqrTarget)}</td>
                            <td className="num">{formatPercent(row.tqrAttainment)}</td>
                            <td><PaceBadge status={row.paceStatus} /></td>
                            <td className={`num ${gapClass(row.tqrGapToPace)}`}>{renderCurrencyGap(row.tqrGapToPace)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {showNewLogo ? (
        <section className="card">
          <h3>New Logo Tracking</h3>
          {(["team_justin", "team_kyra", "team_sydney"] as SubTeam[]).map((subTeam) => {
            const rows = filterBySubTeam(newLogoRows, subTeam);
            return (
              <div key={subTeam} style={{ marginTop: "1rem" }}>
                <h4>{subTeamLabel(subTeam)}</h4>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Rep</th>
                        <th className="num">TQR</th>
                        <th className="num">TQR Attainment</th>
                        <th className="num">NL</th>
                        <th className="num">NL Attainment</th>
                        <th className="num">Weighted Score</th>
                        <th>Pace</th>
                        <th className="num">Gap to Pace</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="muted">No reps assigned.</td>
                        </tr>
                      ) : (
                        rows.map((row) => (
                          <tr key={row.repId}>
                            <td>{row.repName}</td>
                            <td className="num">{formatCurrency(row.tqrActual)} / {formatCurrency(row.tqrTarget)}</td>
                            <td className="num">{formatPercent(row.tqrAttainment)}</td>
                            <td className="num">{row.nlActual === null || row.nlTarget === null ? "N/A" : `${row.nlActual.toLocaleString()} / ${row.nlTarget.toLocaleString()}`}</td>
                            <td className="num">{row.nlAttainment === null ? "N/A" : formatPercent(row.nlAttainment)}</td>
                            <td className="num">{formatScorePercent(row.weightedScore)}</td>
                            <td><PaceBadge status={row.paceStatus} /></td>
                            <td className={`num ${gapClass(row.weightedGapToPace)}`}>{renderScoreGap(row.weightedGapToPace)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

    </div>
  );
}
