import { getCurrentMonthKey, normalizeMonthParam, toMonthLabel } from "@/lib/date";
import { getActiveReps, getCurrentTotalsForMonth } from "@/lib/data";
import { MonthPickerForm } from "@/components/month-picker-form";
import { UpdateForm } from "@/components/update-form";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?:
    | {
        month?: string | string[];
        repId?: string | string[];
      }
    | Promise<{
        month?: string | string[];
        repId?: string | string[];
      }>;
};

function normalizeRepIdParam(value?: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  return raw.trim() || null;
}

export default async function UpdatePage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const selectedMonth = normalizeMonthParam(resolvedSearchParams?.month);
  const requestedRepId = normalizeRepIdParam(resolvedSearchParams?.repId);
  const month = selectedMonth ?? getCurrentMonthKey();
  const [reps, totals] = await Promise.all([getActiveReps(), getCurrentTotalsForMonth(month)]);
  const initialRepId = requestedRepId && reps.some((rep) => rep.id === requestedRepId) ? requestedRepId : undefined;

  return (
    <section className="card toolbar-card">
      <h2>Update Totals</h2>
      <p className="muted">Overwrite current totals for {toMonthLabel(month)}.</p>
      <MonthPickerForm label="Update Month" month={month} />
      {reps.length === 0 ? (
        <p>No active reps found. Seed reps first.</p>
      ) : (
        <UpdateForm month={month} reps={reps} totals={totals} initialRepId={initialRepId} />
      )}
    </section>
  );
}
