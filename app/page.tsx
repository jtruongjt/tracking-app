import { getCurrentMonthKey, normalizeMonthParam, toMonthLabel } from "@/lib/date";
import { getDashboardData } from "@/lib/data";
import { formatCurrency, formatPercent, formatScorePercent } from "@/lib/scoring";
import { PaceBadge } from "@/components/pace-badge";
import { MonthPickerForm } from "@/components/month-picker-form";
import { DashboardRow, SubTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?:
    | {
        month?: string | string[];
      }
    | Promise<{
        month?: string | string[];
      }>;
};

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
  const month = selectedMonth ?? getCurrentMonthKey();
  const data = await getDashboardData(month);
  const expansionRows = data.rows.filter((r) => r.team === "expansion");
  const newLogoRows = data.rows.filter((r) => r.team === "new_logo");

  return (
    <div className="grid">
      <div className="card">
        <h2>{toMonthLabel(month)} Dashboard</h2>
        <p className="muted">Scores: Expansion = TQR only. New Logo = 70% NL + 30% TQR.</p>
        <p className="muted">Two scoreboards are shown below: one for Expansion and one for New Logo.</p>
        <MonthPickerForm label="Live Month" month={month} />
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h3>Expansion Rollup</h3>
          <p>TQR: {formatCurrency(data.rollup.expansion.tqrActual)} / {formatCurrency(data.rollup.expansion.tqrTarget)}</p>
          <p>TQR Attainment: {formatPercent(data.rollup.expansion.tqrTarget > 0 ? data.rollup.expansion.tqrActual / data.rollup.expansion.tqrTarget : 0)}</p>
        </section>
        <section className="card">
          <h3>New Logo Rollup</h3>
          <p>TQR: {formatCurrency(data.rollup.newLogo.tqrActual)} / {formatCurrency(data.rollup.newLogo.tqrTarget)}</p>
          <p>NL: {data.rollup.newLogo.nlActual.toLocaleString()} / {data.rollup.newLogo.nlTarget.toLocaleString()}</p>
          <p>Avg Weighted Score: {formatScorePercent(data.rollup.newLogo.weightedAverage)}</p>
        </section>
      </div>

      <section className="card">
        <h3>Expansion Tracking</h3>
        {(["team_lucy", "team_ryan", "team_mike", "team_bridger"] as SubTeam[]).map((subTeam) => {
          const rows = filterBySubTeam(expansionRows, subTeam);
          return (
            <div key={subTeam} style={{ marginTop: "1rem" }}>
              <h4>{subTeamLabel(subTeam)}</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>TQR</th>
                    <th>TQR Attainment</th>
                    <th>Pace</th>
                    <th>Gap to Pace</th>
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
                        <td>{formatCurrency(row.tqrActual)} / {formatCurrency(row.tqrTarget)}</td>
                        <td>{formatPercent(row.tqrAttainment)}</td>
                        <td><PaceBadge status={row.paceStatus} /></td>
                        <td className={gapClass(row.tqrGapToPace)}>{renderCurrencyGap(row.tqrGapToPace)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>

      <section className="card">
        <h3>New Logo Tracking</h3>
        {(["team_justin", "team_kyra", "team_sydney"] as SubTeam[]).map((subTeam) => {
          const rows = filterBySubTeam(newLogoRows, subTeam);
          return (
            <div key={subTeam} style={{ marginTop: "1rem" }}>
              <h4>{subTeamLabel(subTeam)}</h4>
              <table className="table">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>TQR</th>
                    <th>TQR Attainment</th>
                    <th>NL</th>
                    <th>NL Attainment</th>
                    <th>Weighted Score</th>
                    <th>Pace</th>
                    <th>Gap to Pace</th>
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
                        <td>{formatCurrency(row.tqrActual)} / {formatCurrency(row.tqrTarget)}</td>
                        <td>{formatPercent(row.tqrAttainment)}</td>
                        <td>{row.nlActual === null || row.nlTarget === null ? "N/A" : `${row.nlActual.toLocaleString()} / ${row.nlTarget.toLocaleString()}`}</td>
                        <td>{row.nlAttainment === null ? "N/A" : formatPercent(row.nlAttainment)}</td>
                        <td>{formatScorePercent(row.weightedScore)}</td>
                        <td><PaceBadge status={row.paceStatus} /></td>
                        <td className={gapClass(row.weightedGapToPace)}>{renderScoreGap(row.weightedGapToPace)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </section>

    </div>
  );
}
