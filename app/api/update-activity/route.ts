import { NextResponse } from "next/server";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import { upsertDailyActivity } from "@/lib/data";
import { isDailyActivityEnabled } from "@/lib/features";

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

export async function POST(request: Request) {
  try {
    if (!isDailyActivityEnabled()) {
      return NextResponse.json({ error: "Daily activity tracking is disabled." }, { status: 404 });
    }

    const body = await request.json();
    const repId = String(body.repId ?? "");
    const activityDate = String(body.activityDate ?? "");
    const sdrEvents = Number(body.sdrEvents ?? 0);
    const eventsCreated = Number(body.eventsCreated ?? 0);
    const eventsHeld = Number(body.eventsHeld ?? 0);
    const notesRaw = body.notes === undefined || body.notes === null ? "" : String(body.notes);
    const notes = notesRaw.trim() === "" ? null : notesRaw.trim();

    if (!repId || !activityDate) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }
    if (!isIsoDate(activityDate)) {
      return NextResponse.json({ error: "Date must be in YYYY-MM-DD format." }, { status: 400 });
    }
    if (!isNonNegativeInteger(sdrEvents) || !isNonNegativeInteger(eventsCreated) || !isNonNegativeInteger(eventsHeld)) {
      return NextResponse.json({ error: "Activity values must be non-negative integers." }, { status: 400 });
    }

    const supabase = getSupabaseAnonServerClient();
    const { data: rep, error } = await supabase.from("rep").select("id").eq("id", repId).eq("active", true).maybeSingle();
    if (error) throw new Error(error.message);
    if (!rep) {
      return NextResponse.json({ error: "Active rep not found." }, { status: 404 });
    }

    await upsertDailyActivity({
      repId,
      activityDate,
      sdrEvents,
      eventsCreated,
      eventsHeld,
      notes
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save activity." },
      { status: 500 }
    );
  }
}
