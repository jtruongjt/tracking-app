import { getCurrentMonthKey, normalizeMonthParam, toMonthLabel } from "@/lib/date";
import { getActiveReps, getCurrentTotalsForMonth } from "@/lib/data";
import { MonthPickerForm } from "@/components/month-picker-form";
import { UpdateForm } from "@/components/update-form";

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

export default async function UpdatePage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const selectedMonth = normalizeMonthParam(resolvedSearchParams?.month);
  const month = selectedMonth ?? getCurrentMonthKey();
  const [reps, totals] = await Promise.all([getActiveReps(), getCurrentTotalsForMonth(month)]);

  return (
    <section className="card">
      <h2>Update Totals</h2>
      <p className="muted">Overwrite current totals for {toMonthLabel(month)}.</p>
      <MonthPickerForm label="Update Month" month={month} />
      {reps.length === 0 ? (
        <p>No active reps found. Seed reps first.</p>
      ) : (
        <UpdateForm month={month} reps={reps} totals={totals} />
      )}
    </section>
  );
}
