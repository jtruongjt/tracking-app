import Link from "next/link";
import { ActivityForm } from "@/components/activity-form";
import { DatePickerForm } from "@/components/date-picker-form";
import { getCurrentDateKey, normalizeDateParam, toDateLabel } from "@/lib/date";
import { getActiveReps, getDailyActivityForDate } from "@/lib/data";
import { isDailyActivityEnabled } from "@/lib/features";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?:
    | {
        date?: string | string[];
        repId?: string | string[];
      }
    | Promise<{
        date?: string | string[];
        repId?: string | string[];
      }>;
};

function normalizeRepIdParam(value?: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return raw.trim() || null;
}

export default async function ActivityUpdatePage({ searchParams }: Props) {
  if (!isDailyActivityEnabled()) {
    return (
      <section className="card">
        <h2>Daily Activity Submission</h2>
        <p>Daily activity tracking is currently disabled.</p>
      </section>
    );
  }

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const selectedDate = normalizeDateParam(resolvedSearchParams?.date);
  const activityDate = selectedDate ?? getCurrentDateKey();
  const requestedRepId = normalizeRepIdParam(resolvedSearchParams?.repId);

  const [reps, activities] = await Promise.all([getActiveReps(), getDailyActivityForDate(activityDate)]);
  const initialRepId = requestedRepId && reps.some((rep) => rep.id === requestedRepId) ? requestedRepId : undefined;

  return (
    <section className="card toolbar-card">
      <h2>Daily Activity Submission</h2>
      <p className="muted">Submit or edit rep activity for {toDateLabel(activityDate)}.</p>
      <p>
        <Link href={`/activity?date=${activityDate}`}>Back to Activity Dashboard</Link>
      </p>
      <DatePickerForm label="Activity Date" date={activityDate} />
      {reps.length === 0 ? (
        <p>No active reps found. Seed reps first.</p>
      ) : (
        <ActivityForm
          activityDate={activityDate}
          reps={reps}
          activities={activities}
          initialRepId={initialRepId}
        />
      )}
    </section>
  );
}
