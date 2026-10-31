import { NextResponse } from "next/server";
import { utcDate } from "@/game/daily";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

/**
 * Starts the server's clock for today's wave. Only the first call creates the ride, so later
 * ones (a reload, another device) get the same clock back and can't buy a second attempt.
 */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: profile } = await admin.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Pick a name first." }, { status: 409 });

  const date = utcDate();
  const { error: startError } = await admin
    .from("daily_rides")
    .upsert(
      { user_id: user.id, wave_date: date, started_at: new Date().toISOString() },
      { onConflict: "user_id,wave_date", ignoreDuplicates: true },
    );
  const { data: ride, error } = await admin
    .from("daily_rides")
    .select("started_at, finished_at, won, ms, percent, moves")
    .eq("user_id", user.id)
    .eq("wave_date", date)
    .maybeSingle();
  if (startError || error || !ride) return NextResponse.json({ error: "Couldn't start your ride." }, { status: 500 });

  return NextResponse.json({
    date,
    elapsedMs: Date.now() - Date.parse(ride.started_at),
    finished: ride.finished_at ? { won: ride.won, ms: ride.ms, percent: ride.percent, moves: ride.moves } : null,
  });
}
