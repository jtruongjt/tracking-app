import { DatePickerForm } from "@/components/date-picker-form";
import { addDays, dateKeyToDate, getCurrentDateKey, getWeekStartKey, normalizeDateParam, toDateLabel, toWeekLabel } from "@/lib/date";
import { getActiveReps, getDailyActivityForDate, getDailyActivityForRange } from "@/lib/data";
import { isDailyActivityEnabled } from "@/lib/features";
import { SubTeam, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?:
    | {
        date?: string | string[];
        weekStart?: string | string[];
        view?: string | string[];
        team?: string | string[];
        subTeam?: string | string[];
      }
    | Promise<{
        date?: string | string[];
        weekStart?: string | string[];
        view?: string | string[];
        team?: string | string[];
        subTeam?: string | string[];
      }>;
};

const expansionSubTeams: SubTeam[] = ["team_lucy", "team_ryan", "team_mike", "team_bridger"];
const newLogoSubTeams: SubTeam[] = ["team_justin", "team_kyra", "team_sydney"];
const allSubTeams: SubTeam[] = [...expansionSubTeams, ...newLogoSubTeams];

function labelForSubTeam(subTeam: SubTeam): string {
  if (subTeam === "team_lucy") return "Team Lucy";
  if (subTeam === "team_ryan") return "Team Ryan";
  if (subTeam === "team_mike") return "Team Mike";
  if (subTeam === "team_bridger") return "Team Bridger";
  if (subTeam === "team_justin") return "Team Justin";
  if (subTeam === "team_sydney") return "Team Sydney";
  return "Team Kyra";
}

function normalizeTeamParam(value?: string | string[]): Team | "all" {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "expansion" || raw === "new_logo") return raw;
  return "all";
}

function normalizeSubTeamParam(value?: string | string[]): SubTeam | "all" {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw === "all") return "all";
  return allSubTeams.includes(raw as SubTeam) ? (raw as SubTeam) : "all";
}

export default async function ActivityPage({ searchParams }: Props) {
  if (!isDailyActivityEnabled()) {
    return (
      <section className="card">
        <h2>Daily Activity</h2>
        <p>Daily activity tracking is currently disabled.</p>
      </section>
    );
  }

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const rawView = Array.isArray(resolvedSearchParams?.view) ? resolvedSearchParams?.view[0] : resolvedSearchParams?.view;
  const view = rawView === "week" ? "week" : "day";
  const teamFilter = normalizeTeamParam(resolvedSearchParams?.team);
  const subTeamFilter = normalizeSubTeamParam(resolvedSearchParams?.subTeam);
  const selectedDate = normalizeDateParam(resolvedSearchParams?.date);
  const selectedWeekStart = normalizeDateParam(resolvedSearchParams?.weekStart);
  const activityDate = selectedDate ?? getCurrentDateKey();
  const resolvedWeekStart = getWeekStartKey(dateKeyToDate(selectedWeekStart ?? activityDate));
  const weekEnd = addDays(resolvedWeekStart, 6);
  const previousWeekStart = addDays(resolvedWeekStart, -7);
  const nextWeekStart = addDays(resolvedWeekStart, 7);

  const [reps, activities] = await Promise.all([
    getActiveReps(),
    view === "week" ? getDailyActivityForRange(resolvedWeekStart, weekEnd) : getDailyActivityForDate(activityDate)
  ]);

  const filteredReps = reps.filter((rep) => {
    if (teamFilter !== "all" && rep.team !== teamFilter) return false;
    if (subTeamFilter !== "all" && rep.sub_team !== subTeamFilter) return false;
    return true;
  });
  const filteredRepIds = new Set(filteredReps.map((rep) => rep.id));

  const activityTotalsByRepId = new Map<string, { sdrEvents: number; eventsCreated: number; eventsHeld: number }>();
  for (const activity of activities) {
    if (!filteredRepIds.has(activity.rep_id)) continue;
    const existing = activityTotalsByRepId.get(activity.rep_id) ?? { sdrEvents: 0, eventsCreated: 0, eventsHeld: 0 };
    existing.sdrEvents += activity.sdr_events;
    existing.eventsCreated += activity.events_created;
    existing.eventsHeld += activity.events_held;
    activityTotalsByRepId.set(activity.rep_id, existing);
  }

  const expansionReps = filteredReps.filter((rep) => rep.team === "expansion");
  const newLogoReps = filteredReps.filter((rep) => rep.team === "new_logo");

  function leaderboardValue(repId: string): number {
    const activity = activityTotalsByRepId.get(repId);
    return (activity?.eventsCreated ?? 0) + (activity?.eventsHeld ?? 0);
  }

  const expansionLeaderboard = [...expansionReps].sort((a, b) => {
    const scoreDiff = leaderboardValue(b.id) - leaderboardValue(a.id);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });

  const newLogoLeaderboard = [...newLogoReps].sort((a, b) => {
    const scoreDiff = leaderboardValue(b.id) - leaderboardValue(a.id);
    if (scoreDiff !== 0) return scoreDiff;
    return a.name.localeCompare(b.name);
  });

  const totals = Array.from(activityTotalsByRepId.values()).reduce(
    (acc, repTotals) => {
      acc.sdrEvents += repTotals.sdrEvents;
      acc.eventsCreated += repTotals.eventsCreated;
      acc.eventsHeld += repTotals.eventsHeld;
      return acc;
    },
    { sdrEvents: 0, eventsCreated: 0, eventsHeld: 0 }
  );

  const periodLabel = view === "week" ? `Week (${toWeekLabel(resolvedWeekStart)})` : toDateLabel(activityDate);
  const showExpansion = teamFilter === "all" || teamFilter === "expansion";
  const showNewLogo = teamFilter === "all" || teamFilter === "new_logo";
  const querySuffix = `&team=${teamFilter}&subTeam=${subTeamFilter}`;
  const subTeamOptions =
    teamFilter === "expansion"
      ? expansionSubTeams
      : teamFilter === "new_logo"
        ? newLogoSubTeams
        : allSubTeams;

  return (
    <div className="grid">
      <section className="card toolbar-card">
        <h2>Daily Activity</h2>
        <p className="muted">View submissions and team totals by day or by week.</p>
        <div className="toolbar-switches">
          <a className={view === "day" ? "button-link" : "nav-toggle-link"} href={`/activity?view=day&date=${activityDate}${querySuffix}`}>
            Day View
          </a>
          <a className={view === "week" ? "button-link" : "nav-toggle-link"} href={`/activity?view=week&weekStart=${resolvedWeekStart}${querySuffix}`}>
            Week View
          </a>
        </div>
        <form method="GET" className="toolbar-form">
          <input type="hidden" name="view" value={view} />
          {view === "week" ? <input type="hidden" name="weekStart" value={resolvedWeekStart} /> : <input type="hidden" name="date" value={activityDate} />}
          <label>
            Team Filter
            <select name="team" defaultValue={teamFilter}>
              <option value="all">All Teams</option>
              <option value="expansion">Expansion</option>
              <option value="new_logo">New Logo</option>
            </select>
          </label>
          <label>
            Sub Team Drilldown
            <select name="subTeam" defaultValue={subTeamFilter}>
              <option value="all">All Sub Teams</option>
              {subTeamOptions.map((subTeam) => (
                <option key={subTeam} value={subTeam}>
                  {labelForSubTeam(subTeam)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Apply Team Filters</button>
        </form>
        {view === "week" ? (
          <div className="grid">
            <DatePickerForm
              label="Week Starting (pick any day)"
              date={resolvedWeekStart}
              hiddenFields={[
                { name: "view", value: "week" },
                { name: "team", value: teamFilter },
                { name: "subTeam", value: subTeamFilter }
              ]}
            />
            <div className="toolbar-switches">
              <a className="nav-toggle-link" href={`/activity?view=week&weekStart=${previousWeekStart}${querySuffix}`}>Previous Week</a>
              <a className="nav-toggle-link" href={`/activity?view=week&weekStart=${nextWeekStart}${querySuffix}`}>Next Week</a>
            </div>
          </div>
        ) : (
          <DatePickerForm
            label="Activity Date"
            date={activityDate}
            hiddenFields={[
              { name: "view", value: "day" },
              { name: "team", value: teamFilter },
              { name: "subTeam", value: subTeamFilter }
            ]}
          />
        )}
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <h3>Period</h3>
          <p className="kpi-value">{view === "week" ? "Week" : "Day"}</p>
          <p className="kpi-note">{periodLabel}</p>
        </article>
        <article className="kpi-card">
          <h3>SDR Events</h3>
          <p className="kpi-value">{totals.sdrEvents.toLocaleString()}</p>
          <p className="kpi-note">Across filtered reps</p>
        </article>
        <article className="kpi-card">
          <h3>Events Created</h3>
          <p className="kpi-value">{totals.eventsCreated.toLocaleString()}</p>
          <p className="kpi-note">Across filtered reps</p>
        </article>
        <article className="kpi-card">
          <h3>Events Held</h3>
          <p className="kpi-value">{totals.eventsHeld.toLocaleString()}</p>
          <p className="kpi-note">Across filtered reps</p>
        </article>
      </section>

      <div className="grid grid-2">
        {showExpansion ? (
          <section className="card">
            <h3>Expansion Activity for {periodLabel}</h3>
            <div className="table-wrap">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th className="num">SDR Events</th>
                    <th className="num">Events Created</th>
                    <th className="num">Events Held</th>
                  </tr>
                </thead>
                <tbody>
                  {expansionLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">No reps assigned.</td>
                    </tr>
                  ) : (
                    expansionLeaderboard.map((rep) => {
                      const activity = activityTotalsByRepId.get(rep.id);
                      return (
                        <tr key={rep.id}>
                          <td>{rep.name}</td>
                          <td className="num">{activity?.sdrEvents ?? 0}</td>
                          <td className="num">{activity?.eventsCreated ?? 0}</td>
                          <td className="num">{activity?.eventsHeld ?? 0}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {showNewLogo ? (
          <section className="card">
            <h3>New Logo Activity for {periodLabel}</h3>
            <div className="table-wrap">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th className="num">SDR Events</th>
                    <th className="num">Events Created</th>
                    <th className="num">Events Held</th>
                  </tr>
                </thead>
                <tbody>
                  {newLogoLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">No reps assigned.</td>
                    </tr>
                  ) : (
                    newLogoLeaderboard.map((rep) => {
                      const activity = activityTotalsByRepId.get(rep.id);
                      return (
                        <tr key={rep.id}>
                          <td>{rep.name}</td>
                          <td className="num">{activity?.sdrEvents ?? 0}</td>
                          <td className="num">{activity?.eventsCreated ?? 0}</td>
                          <td className="num">{activity?.eventsHeld ?? 0}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
