import { NextResponse } from "next/server";
import { utcDate } from "@/game/daily";
import { isWaveDate, withRanks } from "@/game/rides";
import { currentUser, supabaseAdmin } from "@/lib/supabase/server";

const TOP = 20;

/** Public names and times only: no account ids, emails or moves leave this route. */
export async function GET(request: Request) {
  const param = new URL(request.url).searchParams.get("date");
  const date = param ?? utcDate();
  if (!isWaveDate(date)) return NextResponse.json({ error: "That isn't a date." }, { status: 400 });

  const admin = supabaseAdmin();
  const user = await currentUser();
  const [top, riders, mine] = await Promise.all([
    admin
      .from("daily_rides")
      .select("user_id, ms, profiles(handle)")
      .eq("wave_date", date)
      .eq("won", true)
      .order("ms")
      .order("finished_at")
      .limit(TOP),
    admin.from("daily_rides").select("user_id", { count: "exact", head: true }).eq("wave_date", date).not("finished_at", "is", null),
    user
      ? admin.from("daily_rides").select("finished_at, won, ms, percent").eq("user_id", user.id).eq("wave_date", date).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (top.error || riders.error || mine.error) {
    return NextResponse.json({ error: "Couldn't load the rankings." }, { status: 500 });
  }

  const ride = mine.data;
  let rank: number | null = null;
  if (ride?.won && ride.ms !== null) {
    const { count, error } = await admin
      .from("daily_rides")
      .select("user_id", { count: "exact", head: true })
      .eq("wave_date", date)
      .eq("won", true)
      .lt("ms", ride.ms);
    if (error) return NextResponse.json({ error: "Couldn't load the rankings." }, { status: 500 });
    rank = (count ?? 0) + 1;
  }

  const rows = top.data as unknown as { user_id: string; ms: number; profiles: { handle: string } | null }[];
  return NextResponse.json({
    date,
    riders: riders.count ?? 0,
    top: withRanks(rows).map(({ user_id, ms, rank, profiles }) => ({
      rank,
      ms,
      handle: profiles?.handle ?? "Unknown",
      you: user_id === user?.id,
    })),
    me: ride ? { finished: ride.finished_at !== null, won: ride.won, ms: ride.ms, percent: ride.percent, rank } : null,
  });
}
