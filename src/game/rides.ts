// Server-side checks for a Daily Wave ride. The moves are replayed on the real board,
// so a result can't be typed in, and the server's own clock bounds the time.

import { createDailyGame, percentCleared, replayMoves } from "./daily";
import { Move } from "./engine";

const MOVE_TYPES = new Set<string>(["reveal", "flag", "chord"]);
const MAX_MOVES = 5000;
/** A finish can reach the server this long after the player's own clock stopped. */
export const NETWORK_ALLOWANCE_MS = 2000;
const RESERVED_HANDLES = new Set(["admin", "administrator", "minesurfer", "moderator", "support", "system"]);

export const isWaveDate = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export function parseMoves(value: unknown, cellCount: number): Move[] | null {
  if (!Array.isArray(value) || value.length > MAX_MOVES) return null;
  const valid = value.every(
    (m) => MOVE_TYPES.has(m?.type) && Number.isInteger(m?.i) && m.i >= 0 && m.i < cellCount,
  );
  return valid ? value.map(({ type, i }) => ({ type, i })) : null;
}

/** The outcome of a move log, or null if the moves don't actually finish the board. */
export function checkRide(date: string, moves: Move[]): { won: boolean; percent: number } | null {
  const base = createDailyGame(date);
  const game = replayMoves(base, moves);
  if (game.status !== "won" && game.status !== "lost") return null;
  // The last move must be the one that ended it, or the log has been padded.
  if (replayMoves(base, moves.slice(0, -1)).status === game.status) return null;
  return { won: game.status === "won", percent: percentCleared(game, base.opened) };
}

/**
 * Trusts the player's clock only within the allowance, so honest players keep the time they
 * saw and nobody can gain more than the allowance by reporting a faster one.
 */
export function officialMs(claimed: unknown, elapsedMs: number): number {
  const elapsed = Math.max(0, elapsedMs);
  const reported = typeof claimed === "number" && Number.isFinite(claimed) ? claimed : elapsed;
  const ms = Math.min(elapsed, Math.max(reported, elapsed - NETWORK_ALLOWANCE_MS));
  return Math.round(Math.max(0, ms) / 100) * 100;
}

/** The problem with a handle, or null if it's fine. */
export function handleProblem(handle: unknown): string | null {
  if (typeof handle !== "string" || !/^[A-Za-z0-9_-]{3,16}$/.test(handle)) {
    return "Use 3 to 16 letters, numbers, dashes or underscores.";
  }
  return RESERVED_HANDLES.has(handle.toLowerCase()) ? "That name is reserved." : null;
}

/** Tied times share a rank, and the next player's rank skips past them. */
export function withRanks<T extends { ms: number }>(rows: T[]): (T & { rank: number })[] {
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || row.ms !== rows[index - 1].ms) rank = index + 1;
    return { ...row, rank };
  });
}
