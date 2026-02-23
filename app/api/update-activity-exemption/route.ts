import { NextResponse } from "next/server";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import { clearDailyActivityExemption, upsertDailyActivityExemption } from "@/lib/data";
import { DailyActivityExemptionStatus } from "@/lib/types";
import { isDailyActivityEnabled } from "@/lib/features";

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidStatus(value: string): value is DailyActivityExemptionStatus {
  return value === "pto" || value === "ooo" || value === "holiday";
}

export async function POST(request: Request) {
  try {
    if (!isDailyActivityEnabled()) {
      return NextResponse.json({ error: "Daily activity tracking is disabled." }, { status: 404 });
    }

    const body = await request.json();
    const repId = String(body.repId ?? "");
    const activityDate = String(body.activityDate ?? "");
    const status = String(body.status ?? "none");
    const noteRaw = body.note === undefined || body.note === null ? "" : String(body.note);
    const note = noteRaw.trim() === "" ? null : noteRaw.trim();

    if (!repId || !activityDate || !isIsoDate(activityDate)) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const supabase = getSupabaseAnonServerClient();
    const { data: rep, error } = await supabase.from("rep").select("id").eq("id", repId).eq("active", true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!rep) {
      return NextResponse.json({ error: "Active rep not found." }, { status: 404 });
    }

    if (status === "none") {
      await clearDailyActivityExemption({ repId, activityDate });
      return NextResponse.json({ ok: true });
    }

    if (!isValidStatus(status)) {
      return NextResponse.json({ error: "Invalid exemption status." }, { status: 400 });
    }

    await upsertDailyActivityExemption({ repId, activityDate, status, note });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save exemption.";
    const setupHint = message.includes("daily_activity_exemption")
      ? " Missing table daily_activity_exemption. Run supabase/add_daily_activity_exemptions.sql."
      : "";
    return NextResponse.json({ error: `${message}${setupHint}` }, { status: 500 });
  }
}
