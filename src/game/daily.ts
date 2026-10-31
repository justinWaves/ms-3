// The Daily Wave: one board per UTC day, the same for every player. Nothing here
// touches the browser, so the rankings server can rebuild and check a run later.

import { applyMove, BoardConfig, chooseMines, createFixedGame, Game, Move, neighbors } from "./engine";

export const DAILY_CONFIG: BoardConfig = { rows: 12, cols: 12, mines: 24 };

/** Wave #1. */
const FIRST_WAVE = "2026-10-31";
/** Changing the generator changes every board, so past results stop being replayable. Bump this if it must change. */
const GENERATOR = "v1";
const MS_PER_DAY = 86_400_000;
const MAX_ATTEMPTS = 20_000;
const BAR_LENGTH = 10;

export interface DailyResult {
  won: boolean;
  /** Time in milliseconds, rounded to tenths of a second. */
  ms: number;
  /** How much of the unopened water was cleared, 0 to 100. */
  percent: number;
  /** Kept for today's board only, so it can be shown again. */
  moves?: Move[];
}

export type DailyResults = Record<string, DailyResult>;

export interface DailyStats {
  played: number;
  won: number;
  streak: number;
  bestStreak: number;
}

export function utcDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const dayNumber = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / MS_PER_DAY);

export function waveNumber(date: string): number {
  return dayNumber(date) - dayNumber(FIRST_WAVE) + 1;
}

export function msUntilNextWave(now: Date = new Date()): number {
  return MS_PER_DAY - (now.getTime() % MS_PER_DAY);
}

/** FNV-1a string hash, feeding mulberry32: the same text always gives the same numbers on every device. */
function seededRandom(text: string): () => number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Plays the board using only what a player can see. True means it can be finished
 * by logic alone, so a player's one ride a day never comes down to a coin flip.
 */
export function solvableWithoutGuessing({ cells, rows, cols, mines }: Game): boolean {
  const open = cells.map((cell) => cell.open);
  const knownMine = cells.map(() => false);
  const safeTotal = cells.length - mines;

  const openCell = (start: number) => {
    const stack = [start];
    while (stack.length) {
      const j = stack.pop() as number;
      if (open[j]) continue;
      open[j] = true;
      if (cells[j].n === 0) stack.push(...neighbors(j, rows, cols));
    }
  };

  for (;;) {
    if (open.filter(Boolean).length === safeTotal) return true;
    let progressed = false;

    // Each open number says: this many mines are among these unknown cells.
    const clues: { unknown: number[]; count: number }[] = [];
    cells.forEach((cell, i) => {
      if (!open[i] || cell.n === 0) return;
      const around = neighbors(i, rows, cols);
      const unknown = around.filter((k) => !open[k] && !knownMine[k]);
      if (unknown.length) clues.push({ unknown, count: cell.n - around.filter((k) => knownMine[k]).length });
    });

    const markSafe = (list: number[]) => {
      list.forEach(openCell);
      if (list.length) progressed = true;
    };
    const markMines = (list: number[]) => {
      list.forEach((k) => (knownMine[k] = true));
      if (list.length) progressed = true;
    };

    for (const { unknown, count } of clues) {
      if (count === 0) markSafe(unknown);
      else if (count === unknown.length) markMines(unknown);
    }

    // If one clue's cells sit inside another's, the difference is its own smaller clue.
    if (!progressed) {
      for (const a of clues) {
        for (const b of clues) {
          if (a === b || a.unknown.length >= b.unknown.length) continue;
          if (!a.unknown.every((k) => b.unknown.includes(k))) continue;
          const rest = b.unknown.filter((k) => !a.unknown.includes(k));
          const restCount = b.count - a.count;
          if (restCount === 0) markSafe(rest);
          else if (restCount === rest.length) markMines(rest);
        }
      }
    }

    // Once every mine is accounted for, everything else is safe.
    if (!progressed && knownMine.filter(Boolean).length === mines) {
      markSafe(cells.map((_, i) => i).filter((i) => !open[i] && !knownMine[i]));
    }

    if (!progressed) return false;
  }
}

/** The board for a date, with an opening already cleared so everyone starts from the same spot. */
export function createDailyGame(date: string): Game {
  const { rows, cols } = DAILY_CONFIG;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const random = seededRandom(`${GENERATOR}:${date}:${attempt}`);
    // Start away from the edges, so the opening gives the player something to read.
    const row = 3 + Math.floor(random() * (rows - 6));
    const col = 3 + Math.floor(random() * (cols - 6));
    const start = row * cols + col;
    const game = createFixedGame(DAILY_CONFIG, chooseMines(DAILY_CONFIG, start, random), start);
    if (solvableWithoutGuessing(game)) return game;
  }
  throw new Error(`No solvable board found for ${date}`);
}

export function replayMoves(game: Game, moves: Move[]): Game {
  return moves.reduce(applyMove, game);
}

/** How much of the water that started covered has been cleared. */
export function percentCleared(game: Game, openedAtStart: number): number {
  if (game.status === "won") return 100;
  const toClear = game.cells.length - game.mines - openedAtStart;
  return Math.min(99, Math.floor(((game.opened - openedAtStart) / toClear) * 100));
}

export function computeStats(results: DailyResults, today: string): DailyStats {
  const dates = Object.keys(results).sort();
  let bestStreak = 0;
  let run = 0;
  let previous: number | null = null;
  for (const date of dates) {
    const day = dayNumber(date);
    if (!results[date].won) run = 0;
    else run = previous !== null && day === previous + 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    previous = day;
  }

  // A streak survives until today's wave is lost or a full day is missed.
  let streak = 0;
  const todayNumber = dayNumber(today);
  let day = results[today] ? todayNumber : todayNumber - 1;
  for (;;) {
    const result = results[new Date(day * MS_PER_DAY).toISOString().slice(0, 10)];
    if (!result?.won) break;
    streak++;
    day--;
  }

  return {
    played: dates.length,
    won: dates.filter((date) => results[date].won).length,
    streak,
    bestStreak,
  };
}

export function formatTime(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return seconds.toFixed(1);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

/** Spoiler-free result to paste anywhere: it shows how far you got, never where the sharks are. */
export function shareText(date: string, result: DailyResult, streak: number, url: string): string {
  const filled = result.won ? BAR_LENGTH - 1 : Math.floor((result.percent / 100) * BAR_LENGTH);
  const bar =
    "🟦".repeat(filled) + (result.won ? "🏄" : "🦈") + "⬜".repeat(Math.max(0, BAR_LENGTH - filled - 1));
  const outcome = result.won
    ? `Rode it in: ${formatTime(result.ms)}s`
    : `Wiped out at ${result.percent}%`;
  const lines = [`🌊 Minesurfer Daily Wave #${waveNumber(date)}`, outcome, bar];
  if (streak > 1) lines.push(`🔥 ${streak}-day streak`);
  lines.push(url);
  return lines.join("\n");
}
