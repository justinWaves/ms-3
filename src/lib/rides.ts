import { DailyResult } from "@/game/daily";
import { Move } from "@/game/engine";

const UNSENT_KEY = "ms-daily-unsent";

export interface StartedRide {
  date: string;
  elapsedMs: number;
  finished: DailyResult | null;
}

interface FinishedRide {
  date: string;
  moves: Move[];
  ms: number;
}

/** Starts or resumes today's ride on the server. Null means this ride can't be ranked. */
export async function startRide(): Promise<StartedRide | null> {
  try {
    const response = await fetch("/api/daily/start", { method: "POST" });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

const post = (ride: FinishedRide) =>
  fetch("/api/daily/finish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ride),
  });

/** Sends a finished ride. If the network drops it, it's kept and sent next visit. */
export async function sendRide(ride: FinishedRide): Promise<boolean> {
  try {
    if ((await post(ride)).ok) return true;
  } catch {
    // Handled below, the same as a server error.
  }
  try {
    localStorage.setItem(UNSENT_KEY, JSON.stringify(ride));
  } catch {
    // Without storage there's nowhere to keep it for a retry.
  }
  return false;
}

/** Retries a ride that couldn't be sent. Resolves true if one went through. */
export async function sendUnsentRide(): Promise<boolean> {
  try {
    const saved = localStorage.getItem(UNSENT_KEY);
    if (!saved) return false;
    const response = await post(JSON.parse(saved) as FinishedRide);
    // A rejected ride will never succeed, so only a temporary failure keeps it.
    if (response.ok || response.status < 500) localStorage.removeItem(UNSENT_KEY);
    return response.ok;
  } catch {
    return false;
  }
}
