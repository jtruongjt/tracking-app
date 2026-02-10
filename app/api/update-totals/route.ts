import { NextResponse } from "next/server";
import { getSupabaseAnonServerClient } from "@/lib/supabase/server";
import { upsertCurrentTotals } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const repId = String(body.repId ?? "");
    const month = String(body.month ?? "");
    const tqrActual = Number(body.tqrActual ?? 0);
    const nlActual = body.nlActual === null || body.nlActual === undefined ? null : Number(body.nlActual);

    if (!repId || !month || !Number.isFinite(tqrActual)) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }
    if (tqrActual < 0) {
      return NextResponse.json({ error: "TQR must be non-negative." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Month must be in YYYY-MM format." }, { status: 400 });
    }

    const supabase = getSupabaseAnonServerClient();
    const { data: rep, error } = await supabase.from("rep").select("id,team").eq("id", repId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!rep) {
      return NextResponse.json({ error: "Rep not found." }, { status: 404 });
    }

    if (rep.team === "expansion") {
      await upsertCurrentTotals({ repId, month, tqrActual, nlActual: null });
    } else {
      if (nlActual === null || !Number.isFinite(nlActual)) {
        return NextResponse.json({ error: "NL value is required for New Logo reps." }, { status: 400 });
      }
      if (nlActual < 0) {
        return NextResponse.json({ error: "New Logo must be non-negative." }, { status: 400 });
      }
      await upsertCurrentTotals({ repId, month, tqrActual, nlActual });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save totals." },
      { status: 500 }
    );
  }
}
