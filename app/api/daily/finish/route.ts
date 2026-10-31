import { NextResponse } from "next/server";
import { DAILY_CONFIG } from "@/game/daily";
import { checkRide, isWaveDate, officialMs, parseMoves } from "@/game/rides";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

const CELL_COUNT = DAILY_CONFIG.rows * DAILY_CONFIG.cols;

/** Replays the player's moves on the real board, and records the ride if they really finish it. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const moves = parseMoves(body?.moves, CELL_COUNT);
  if (!isWaveDate(body?.date) || !moves) {
    return NextResponse.json({ error: "That ride doesn't look right." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: ride, error } = await admin
    .from("daily_rides")
    .select("started_at, finished_at, won, ms, percent")
    .eq("user_id", user.id)
    .eq("wave_date", body.date)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn't save your ride." }, { status: 500 });
  if (!ride) return NextResponse.json({ error: "This ride was never started." }, { status: 404 });
  // A retry after a dropped connection gets the saved result rather than a new one.
  if (ride.finished_at) return NextResponse.json({ won: ride.won, ms: ride.ms, percent: ride.percent });

  const outcome = checkRide(body.date, moves);
  if (!outcome) return NextResponse.json({ error: "Those moves don't finish the wave." }, { status: 422 });

  const finishedAt = new Date();
  const ms = officialMs(body.ms, finishedAt.getTime() - Date.parse(ride.started_at));
  const { error: saveError } = await admin
    .from("daily_rides")
    .update({ finished_at: finishedAt.toISOString(), ms, moves, ...outcome })
    .eq("user_id", user.id)
    .eq("wave_date", body.date)
    .is("finished_at", null);
  if (saveError) return NextResponse.json({ error: "Couldn't save your ride." }, { status: 500 });
  return NextResponse.json({ ...outcome, ms });
}
