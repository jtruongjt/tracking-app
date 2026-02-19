import { DatePickerForm } from "@/components/date-picker-form";
import { addDays, dateKeyToDate, getCurrentDateKey, getWeekStartKey, normalizeDateParam, toDateLabel, toWeekLabel } from "@/lib/date";
import { getActiveReps, getDailyActivityForDate, getDailyActivityForRange } from "@/lib/data";
import { isDailyActivityEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?:
    | {
        date?: string | string[];
        weekStart?: string | string[];
        view?: string | string[];
      }
    | Promise<{
        date?: string | string[];
        weekStart?: string | string[];
        view?: string | string[];
      }>;
};

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

  const activityTotalsByRepId = new Map<string, { sdrEvents: number; eventsCreated: number; eventsHeld: number }>();
  for (const activity of activities) {
    const existing = activityTotalsByRepId.get(activity.rep_id) ?? { sdrEvents: 0, eventsCreated: 0, eventsHeld: 0 };
    existing.sdrEvents += activity.sdr_events;
    existing.eventsCreated += activity.events_created;
    existing.eventsHeld += activity.events_held;
    activityTotalsByRepId.set(activity.rep_id, existing);
  }

  const expansionReps = reps.filter((rep) => rep.team === "expansion");
  const newLogoReps = reps.filter((rep) => rep.team === "new_logo");

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

  return (
    <div className="grid">
      <section className="card">
        <h2>Daily Activity</h2>
        <p className="muted">View submissions and team totals by day or by week.</p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <a className={view === "day" ? "button-link" : "nav-toggle-link"} href={`/activity?view=day&date=${activityDate}`}>
            Day View
          </a>
          <a className={view === "week" ? "button-link" : "nav-toggle-link"} href={`/activity?view=week&weekStart=${resolvedWeekStart}`}>
            Week View
          </a>
        </div>
        {view === "week" ? (
          <div className="grid" style={{ gap: "0.6rem" }}>
            <DatePickerForm
              label="Week Starting (pick any day)"
              date={resolvedWeekStart}
              submitLabel="Load Week"
              hiddenFields={[{ name: "view", value: "week" }]}
            />
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <a className="nav-toggle-link" href={`/activity?view=week&weekStart=${previousWeekStart}`}>Previous Week</a>
              <a className="nav-toggle-link" href={`/activity?view=week&weekStart=${nextWeekStart}`}>Next Week</a>
            </div>
          </div>
        ) : (
          <DatePickerForm label="Activity Date" date={activityDate} hiddenFields={[{ name: "view", value: "day" }]} />
        )}
      </section>

      <section className="card">
        <h3>{periodLabel} Summary</h3>
        <p>SDR Events: {totals.sdrEvents}</p>
        <p>Events Created: {totals.eventsCreated}</p>
        <p>Events Held: {totals.eventsHeld}</p>
        <p>Submitted Reps: {activityTotalsByRepId.size} / {reps.length}</p>
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h3>Expansion Activity for {periodLabel}</h3>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Rep</th>
                <th>SDR Events</th>
                <th>Events Created</th>
                <th>Events Held</th>
              </tr>
            </thead>
            <tbody>
              {expansionLeaderboard.map((rep) => {
                const activity = activityTotalsByRepId.get(rep.id);
                return (
                  <tr key={rep.id}>
                    <td>{rep.name}</td>
                    <td>{activity?.sdrEvents ?? 0}</td>
                    <td>{activity?.eventsCreated ?? 0}</td>
                    <td>{activity?.eventsHeld ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h3>New Logo Activity for {periodLabel}</h3>
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Rep</th>
                <th>SDR Events</th>
                <th>Events Created</th>
                <th>Events Held</th>
              </tr>
            </thead>
            <tbody>
              {newLogoLeaderboard.map((rep) => {
                const activity = activityTotalsByRepId.get(rep.id);
                return (
                  <tr key={rep.id}>
                    <td>{rep.name}</td>
                    <td>{activity?.sdrEvents ?? 0}</td>
                    <td>{activity?.eventsCreated ?? 0}</td>
                    <td>{activity?.eventsHeld ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
