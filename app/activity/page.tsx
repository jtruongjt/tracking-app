import type { Route } from "next";
import Link from "next/link";
import { DatePickerForm } from "@/components/date-picker-form";
import { ActivityFilterForm } from "@/components/activity-filter-form";
import { addDays, dateKeyToDate, getCurrentDateKey, getWeekStartKey, normalizeDateParam, toDateLabel, toWeekLabel } from "@/lib/date";
import { getActiveReps, getDailyActivityExemptionsForRange, getDailyActivityForDate, getDailyActivityForRange } from "@/lib/data";
import { isDailyActivityEnabled } from "@/lib/features";
import { DailyActivityExemptionStatus, SubTeam, Team } from "@/lib/types";

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

function isWeekdayDateKey(dateKey: string): boolean {
  const day = dateKeyToDate(dateKey).getDay();
  return day >= 1 && day <= 5;
}

function labelForExemptionStatus(status: DailyActivityExemptionStatus): string {
  if (status === "pto") return "PTO";
  if (status === "ooo") return "OOO";
  return "Holiday";
}

function badgeClassForExemptionStatus(status: DailyActivityExemptionStatus): string {
  return status === "holiday" ? "badge-partial" : "badge-info";
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
  const todayDateKey = getCurrentDateKey();
  const resolvedWeekStart = getWeekStartKey(dateKeyToDate(selectedWeekStart ?? activityDate));
  const weekEnd = addDays(resolvedWeekStart, 6);
  const previousWeekStart = addDays(resolvedWeekStart, -7);
  const nextWeekStart = addDays(resolvedWeekStart, 7);
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(resolvedWeekStart, index));
  const weekDayDates = weekDates.filter(isWeekdayDateKey);
  const isCurrentWeek = getWeekStartKey(dateKeyToDate(todayDateKey)) === resolvedWeekStart;
  const expectedWeekdayDates = isCurrentWeek ? weekDayDates.filter((dateKey) => dateKey <= todayDateKey) : weekDayDates;
  const weekdaySubmissionTarget = expectedWeekdayDates.length;
  const expectedWeekdayDateSet = new Set(expectedWeekdayDates);

  const [reps, activities, exemptions] = await Promise.all([
    getActiveReps(),
    view === "week" ? getDailyActivityForRange(resolvedWeekStart, weekEnd) : getDailyActivityForDate(activityDate),
    view === "week"
      ? getDailyActivityExemptionsForRange(resolvedWeekStart, weekEnd)
      : getDailyActivityExemptionsForRange(activityDate, activityDate)
  ]);

  const filteredReps = reps.filter((rep) => {
    if (teamFilter !== "all" && rep.team !== teamFilter) return false;
    if (subTeamFilter !== "all" && rep.sub_team !== subTeamFilter) return false;
    return true;
  });
  const filteredRepIds = new Set(filteredReps.map((rep) => rep.id));

  const activityTotalsByRepId = new Map<string, { sdrEvents: number; eventsCreated: number; eventsHeld: number }>();
  const submittedDatesByRepId = new Map<string, Set<string>>();
  const exemptionStatusByRepDate = new Map<string, DailyActivityExemptionStatus>();
  const exemptDatesByRepId = new Map<string, Set<string>>();
  for (const activity of activities) {
    if (!filteredRepIds.has(activity.rep_id)) continue;
    const existing = activityTotalsByRepId.get(activity.rep_id) ?? { sdrEvents: 0, eventsCreated: 0, eventsHeld: 0 };
    existing.sdrEvents += activity.sdr_events;
    existing.eventsCreated += activity.events_created;
    existing.eventsHeld += activity.events_held;
    activityTotalsByRepId.set(activity.rep_id, existing);
    const submittedDates = submittedDatesByRepId.get(activity.rep_id) ?? new Set<string>();
    submittedDates.add(activity.activity_date);
    submittedDatesByRepId.set(activity.rep_id, submittedDates);
  }
  for (const exemption of exemptions) {
    if (!filteredRepIds.has(exemption.rep_id)) continue;
    const key = `${exemption.rep_id}:${exemption.activity_date}`;
    exemptionStatusByRepDate.set(key, exemption.status);
    const exemptDates = exemptDatesByRepId.get(exemption.rep_id) ?? new Set<string>();
    exemptDates.add(exemption.activity_date);
    exemptDatesByRepId.set(exemption.rep_id, exemptDates);
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
  const missingSubmissionCount = filteredReps.filter((rep) => {
    if (view === "day") {
      const repDateKey = `${rep.id}:${activityDate}`;
      const isExempt = exemptionStatusByRepDate.has(repDateKey);
      const isSubmitted = (submittedDatesByRepId.get(rep.id) ?? new Set<string>()).has(activityDate);
      return !isExempt && !isSubmitted;
    }

    return expectedWeekdayDates.some((dateKey) => {
      const repDateKey = `${rep.id}:${dateKey}`;
      const isExempt = exemptionStatusByRepDate.has(repDateKey);
      const isSubmitted = (submittedDatesByRepId.get(rep.id) ?? new Set<string>()).has(dateKey);
      return !isExempt && !isSubmitted;
    });
  }).length;
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
        <ActivityFilterForm
          view={view}
          activityDate={activityDate}
          weekStart={resolvedWeekStart}
          team={teamFilter}
          subTeam={subTeamFilter}
          subTeamOptions={subTeamOptions}
        />
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
        <article className="kpi-card">
          <h3>Missing Submissions</h3>
          <p className="kpi-value kpi-status-behind">{missingSubmissionCount}</p>
          <p className="kpi-note">No entry for selected {view === "week" ? "week" : "day"}</p>
        </article>
      </section>

      <div className="grid activity-table-grid">
        {showExpansion ? (
          <section className="card activity-table-card">
            <h3>Expansion Activity for {periodLabel}</h3>
            <div className="table-wrap">
              <table className="table table-striped table-compact activity-table">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>Status</th>
                    <th className="num">SDR</th>
                    <th className="num">Created</th>
                    <th className="num">Held</th>
                  </tr>
                </thead>
                <tbody>
                  {expansionLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">No reps assigned.</td>
                    </tr>
                  ) : (
                    expansionLeaderboard.map((rep) => {
                      const activity = activityTotalsByRepId.get(rep.id);
                      const repSubmittedDates = submittedDatesByRepId.get(rep.id) ?? new Set<string>();
                      const repExemptDates = exemptDatesByRepId.get(rep.id) ?? new Set<string>();
                      const dayExemption = exemptionStatusByRepDate.get(`${rep.id}:${activityDate}`);

                      let statusLabel = "Missing";
                      let statusClass = "badge-missing";
                      let isMissingSubmission = false;

                      if (view === "day") {
                        const isSubmitted = repSubmittedDates.has(activityDate);
                        if (dayExemption) {
                          statusLabel = labelForExemptionStatus(dayExemption);
                          statusClass = badgeClassForExemptionStatus(dayExemption);
                        } else if (isSubmitted) {
                          statusLabel = "Submitted";
                          statusClass = "badge-submitted";
                        } else {
                          statusLabel = "Missing";
                          statusClass = "badge-missing";
                          isMissingSubmission = true;
                        }
                      } else {
                        const exemptDays = expectedWeekdayDates.filter((dateKey) => repExemptDates.has(dateKey)).length;
                        const requiredDays = Math.max(0, weekdaySubmissionTarget - exemptDays);
                        const submittedDays = expectedWeekdayDates.filter((dateKey) => !repExemptDates.has(dateKey) && repSubmittedDates.has(dateKey)).length;
                        const missingRequiredDays = Math.max(0, requiredDays - submittedDays);

                        if (weekdaySubmissionTarget === 0) {
                          statusLabel = "Not started";
                          statusClass = "badge-upcoming";
                        } else if (requiredDays === 0 && exemptDays > 0) {
                          statusLabel = `${exemptDays} off`;
                          statusClass = "badge-info";
                        } else if (requiredDays > 0) {
                          const offSuffix = exemptDays > 0 ? ` + ${exemptDays} off` : "";
                          statusLabel = `${submittedDays}/${requiredDays} days${offSuffix}`;
                          isMissingSubmission = missingRequiredDays > 0;
                          statusClass =
                            missingRequiredDays === 0
                              ? "badge-submitted"
                              : submittedDays > 0 || exemptDays > 0
                                ? "badge-partial"
                                : "badge-missing";
                        }
                      }
                      const missingUpdateHref = view === "day" && isMissingSubmission
                        ? (`/activity/update?date=${activityDate}&repId=${rep.id}` as Route)
                        : null;
                      return (
                        <tr key={rep.id} className={isMissingSubmission ? "row-missing-submission" : undefined}>
                          <td>{rep.name}</td>
                          <td>
                            {missingUpdateHref ? (
                              <Link href={missingUpdateHref}>
                                <span className={`badge ${statusClass}`}>{statusLabel}</span>
                              </Link>
                            ) : (
                              <span className={`badge ${statusClass}`}>{statusLabel}</span>
                            )}
                          </td>
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
          <section className="card activity-table-card">
            <h3>New Logo Activity for {periodLabel}</h3>
            <div className="table-wrap">
              <table className="table table-striped table-compact activity-table">
                <thead>
                  <tr>
                    <th>Rep</th>
                    <th>Status</th>
                    <th className="num">SDR</th>
                    <th className="num">Created</th>
                    <th className="num">Held</th>
                  </tr>
                </thead>
                <tbody>
                  {newLogoLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="muted">No reps assigned.</td>
                    </tr>
                  ) : (
                    newLogoLeaderboard.map((rep) => {
                      const activity = activityTotalsByRepId.get(rep.id);
                      const repSubmittedDates = submittedDatesByRepId.get(rep.id) ?? new Set<string>();
                      const repExemptDates = exemptDatesByRepId.get(rep.id) ?? new Set<string>();
                      const dayExemption = exemptionStatusByRepDate.get(`${rep.id}:${activityDate}`);

                      let statusLabel = "Missing";
                      let statusClass = "badge-missing";
                      let isMissingSubmission = false;

                      if (view === "day") {
                        const isSubmitted = repSubmittedDates.has(activityDate);
                        if (dayExemption) {
                          statusLabel = labelForExemptionStatus(dayExemption);
                          statusClass = badgeClassForExemptionStatus(dayExemption);
                        } else if (isSubmitted) {
                          statusLabel = "Submitted";
                          statusClass = "badge-submitted";
                        } else {
                          statusLabel = "Missing";
                          statusClass = "badge-missing";
                          isMissingSubmission = true;
                        }
                      } else {
                        const exemptDays = expectedWeekdayDates.filter((dateKey) => repExemptDates.has(dateKey)).length;
                        const requiredDays = Math.max(0, weekdaySubmissionTarget - exemptDays);
                        const submittedDays = expectedWeekdayDates.filter((dateKey) => !repExemptDates.has(dateKey) && repSubmittedDates.has(dateKey)).length;
                        const missingRequiredDays = Math.max(0, requiredDays - submittedDays);

                        if (weekdaySubmissionTarget === 0) {
                          statusLabel = "Not started";
                          statusClass = "badge-upcoming";
                        } else if (requiredDays === 0 && exemptDays > 0) {
                          statusLabel = `${exemptDays} off`;
                          statusClass = "badge-info";
                        } else if (requiredDays > 0) {
                          const offSuffix = exemptDays > 0 ? ` + ${exemptDays} off` : "";
                          statusLabel = `${submittedDays}/${requiredDays} days${offSuffix}`;
                          isMissingSubmission = missingRequiredDays > 0;
                          statusClass =
                            missingRequiredDays === 0
                              ? "badge-submitted"
                              : submittedDays > 0 || exemptDays > 0
                                ? "badge-partial"
                                : "badge-missing";
                        }
                      }
                      const missingUpdateHref = view === "day" && isMissingSubmission
                        ? (`/activity/update?date=${activityDate}&repId=${rep.id}` as Route)
                        : null;
                      return (
                        <tr key={rep.id} className={isMissingSubmission ? "row-missing-submission" : undefined}>
                          <td>{rep.name}</td>
                          <td>
                            {missingUpdateHref ? (
                              <Link href={missingUpdateHref}>
                                <span className={`badge ${statusClass}`}>{statusLabel}</span>
                              </Link>
                            ) : (
                              <span className={`badge ${statusClass}`}>{statusLabel}</span>
                            )}
                          </td>
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
