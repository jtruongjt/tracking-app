import { DatePickerForm } from "@/components/date-picker-form";
import { ManagerFilterForm } from "@/components/manager-filter-form";
import { ManagerWeekGrid } from "@/components/manager-week-grid";
import { addDays, dateKeyToDate, getCurrentDateKey, getWeekStartKey, normalizeDateParam, toWeekLabel } from "@/lib/date";
import { getActiveReps, getDailyActivityExemptionsForRange, getDailyActivityForRange } from "@/lib/data";
import { isDailyActivityEnabled } from "@/lib/features";
import { DailyActivityExemptionStatus, SubTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?:
    | {
        weekStart?: string | string[];
        date?: string | string[];
        manager?: string | string[];
      }
    | Promise<{
        weekStart?: string | string[];
        date?: string | string[];
        manager?: string | string[];
      }>;
};

const managerOrder: SubTeam[] = ["team_lucy", "team_ryan", "team_mike", "team_bridger", "team_justin", "team_kyra", "team_sydney"];

function labelForSubTeam(subTeam: SubTeam): string {
  if (subTeam === "team_lucy") return "Team Lucy";
  if (subTeam === "team_ryan") return "Team Ryan";
  if (subTeam === "team_mike") return "Team Mike";
  if (subTeam === "team_bridger") return "Team Bridger";
  if (subTeam === "team_justin") return "Team Justin";
  if (subTeam === "team_sydney") return "Team Sydney";
  return "Team Kyra";
}

function normalizeManagerParam(value?: string | string[]): SubTeam | "all" {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || raw === "all") return "all";
  return managerOrder.includes(raw as SubTeam) ? (raw as SubTeam) : "all";
}

function isWeekdayDateKey(dateKey: string): boolean {
  const day = dateKeyToDate(dateKey).getDay();
  return day >= 1 && day <= 5;
}

export default async function ActivityManagerPage({ searchParams }: Props) {
  if (!isDailyActivityEnabled()) {
    return (
      <section className="card">
        <h2>Manager Weekly Activity</h2>
        <p>Daily activity tracking is currently disabled.</p>
      </section>
    );
  }

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const selectedDate = normalizeDateParam(resolvedSearchParams?.date);
  const selectedWeekStart = normalizeDateParam(resolvedSearchParams?.weekStart);
  const managerFilter = normalizeManagerParam(resolvedSearchParams?.manager);
  const todayDateKey = getCurrentDateKey();
  const resolvedWeekStart = getWeekStartKey(dateKeyToDate(selectedWeekStart ?? selectedDate ?? todayDateKey));
  const weekEnd = addDays(resolvedWeekStart, 6);
  const previousWeekStart = addDays(resolvedWeekStart, -7);
  const nextWeekStart = addDays(resolvedWeekStart, 7);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(resolvedWeekStart, index)).filter(isWeekdayDateKey);

  let reps: Awaited<ReturnType<typeof getActiveReps>>;
  let activities: Awaited<ReturnType<typeof getDailyActivityForRange>>;
  let exemptions: Awaited<ReturnType<typeof getDailyActivityExemptionsForRange>>;
  try {
    [reps, activities, exemptions] = await Promise.all([
      getActiveReps(),
      getDailyActivityForRange(resolvedWeekStart, weekEnd),
      getDailyActivityExemptionsForRange(resolvedWeekStart, weekEnd)
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load manager weekly data.";
    if (message.includes("daily_activity_exemption")) {
      return (
        <section className="card">
          <h2>Manager Weekly Activity</h2>
          <p className="notice notice-error">Missing table setup for PTO/OOO/Holiday statuses.</p>
          <p className="muted">Run `supabase/add_daily_activity_exemptions.sql` against your Supabase database, then refresh this page.</p>
        </section>
      );
    }
    throw error;
  }

  const filteredReps = reps.filter((rep) => (managerFilter === "all" ? true : rep.sub_team === managerFilter));
  const repIds = new Set(filteredReps.map((rep) => rep.id));
  const filteredActivities = activities.filter((row) => repIds.has(row.rep_id));
  const filteredExemptions = exemptions.filter((row) => repIds.has(row.rep_id));

  const activityCellKeys = new Set(filteredActivities.map((row) => `${row.rep_id}:${row.activity_date}`));
  const exemptionByCell = new Map<string, DailyActivityExemptionStatus>();
  for (const row of filteredExemptions) {
    exemptionByCell.set(`${row.rep_id}:${row.activity_date}`, row.status);
  }

  let submittedCount = 0;
  let exemptCount = 0;
  let missingCount = 0;
  let upcomingCount = 0;

  for (const rep of filteredReps) {
    for (const dateKey of weekDates) {
      const cellKey = `${rep.id}:${dateKey}`;
      if (exemptionByCell.has(cellKey)) {
        exemptCount += 1;
        continue;
      }
      if (activityCellKeys.has(cellKey)) {
        submittedCount += 1;
        continue;
      }
      if (dateKey > todayDateKey) {
        upcomingCount += 1;
        continue;
      }
      missingCount += 1;
    }
  }

  const trackedDayCount = filteredReps.length * weekDates.length;
  const managerLabel = managerFilter === "all" ? "All Managers" : labelForSubTeam(managerFilter);

  return (
    <div className="grid">
      <section className="card toolbar-card">
        <h2>Manager Weekly Activity</h2>
        <p className="muted">Review rep submissions for the week, mark PTO/OOO/Holiday, and jump into edits for missing days.</p>
        <ManagerFilterForm
          weekStart={resolvedWeekStart}
          manager={managerFilter}
          managerOptions={managerOrder}
        />
        <div className="toolbar-switches">
          <a className="nav-toggle-link" href={`/activity/manager?weekStart=${previousWeekStart}&manager=${managerFilter}`}>Previous Week</a>
          <a className="nav-toggle-link" href={`/activity/manager?weekStart=${nextWeekStart}&manager=${managerFilter}`}>Next Week</a>
        </div>
        <DatePickerForm
          label="Week Starting (pick any day)"
          date={resolvedWeekStart}
          hiddenFields={[{ name: "manager", value: managerFilter }]}
        />
      </section>

      <section className="kpi-grid">
        <article className="kpi-card">
          <h3>Manager View</h3>
          <p className="kpi-value">{managerFilter === "all" ? "All" : "One"}</p>
          <p className="kpi-note">{managerLabel}</p>
        </article>
        <article className="kpi-card">
          <h3>Week</h3>
          <p className="kpi-value">Mon-Fri</p>
          <p className="kpi-note">{toWeekLabel(resolvedWeekStart)}</p>
        </article>
        <article className="kpi-card">
          <h3>Submitted</h3>
          <p className="kpi-value kpi-status-on_track">{submittedCount}</p>
          <p className="kpi-note">Rep-days with activity</p>
        </article>
        <article className="kpi-card">
          <h3>Exempt</h3>
          <p className="kpi-value kpi-status-at_risk">{exemptCount}</p>
          <p className="kpi-note">PTO / OOO / Holiday</p>
        </article>
        <article className="kpi-card">
          <h3>Missing</h3>
          <p className="kpi-value kpi-status-behind">{missingCount}</p>
          <p className="kpi-note">Excludes exemptions + future days</p>
        </article>
        <article className="kpi-card">
          <h3>Tracked Rep-Days</h3>
          <p className="kpi-value">{trackedDayCount}</p>
          <p className="kpi-note">Upcoming: {upcomingCount}</p>
        </article>
      </section>

      {filteredReps.length === 0 ? (
        <section className="card">
          <p className="muted">No reps found for this manager selection.</p>
        </section>
      ) : (
        <ManagerWeekGrid
          reps={filteredReps.map((rep) => ({ id: rep.id, name: rep.name, team: rep.team, sub_team: rep.sub_team }))}
          weekDates={weekDates}
          activities={filteredActivities.map((row) => ({
            rep_id: row.rep_id,
            activity_date: row.activity_date,
            sdr_events: row.sdr_events,
            events_created: row.events_created,
            events_held: row.events_held
          }))}
          exemptions={filteredExemptions.map((row) => ({ rep_id: row.rep_id, activity_date: row.activity_date, status: row.status }))}
          todayDateKey={todayDateKey}
        />
      )}
    </div>
  );
}
