// Pure game rules with no React or browser APIs, so the leaderboard server can
// replay a player's moves through this same code later. Every move returns a new
// game and only copies the cells it changes.

export type Difficulty = "ankle" | "waist" | "overhead" | "mavericks";

export interface BoardConfig {
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTIES: Record<Difficulty, BoardConfig & { name: string }> = {
  ankle: { name: "Ankle Biter", rows: 9, cols: 9, mines: 10 },
  waist: { name: "Waist High", rows: 12, cols: 12, mines: 24 },
  overhead: { name: "Overhead", rows: 16, cols: 16, mines: 40 },
  mavericks: { name: "Mavericks", rows: 16, cols: 30, mines: 99 },
};

export interface Cell {
  mine: boolean;
  /** How many of the surrounding cells hold a mine. */
  n: number;
  open: boolean;
  flag: boolean;
}

export type Status = "ready" | "playing" | "won" | "lost";

export interface Game extends BoardConfig {
  cells: Cell[];
  status: Status;
  flags: number;
  opened: number;
  /** The mine that ended the game. */
  boom: number | null;
  /** False until mines exist. Free play places them on the first reveal. */
  placed: boolean;
}

export type MoveType = "reveal" | "flag" | "chord";

export interface Move {
  type: MoveType;
  i: number;
}

const EMPTY_CELL: Cell = { mine: false, n: 0, open: false, flag: false };

export function createGame({ rows, cols, mines }: BoardConfig): Game {
  return {
    rows,
    cols,
    mines,
    cells: Array.from({ length: rows * cols }, () => EMPTY_CELL),
    status: "ready",
    flags: 0,
    opened: 0,
    boom: null,
    placed: false,
  };
}

export function neighbors(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols);
  const c = i % cols;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const rr = r + dr;
      const cc = c + dc;
      if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
    }
  }
  return out;
}

/** Picks mine positions, keeping `safe` and its neighbors clear. */
export function chooseMines({ rows, cols, mines }: BoardConfig, safe: number, random: () => number): Set<number> {
  const banned = new Set([safe, ...neighbors(safe, rows, cols)]);
  const pool: number[] = [];
  for (let i = 0; i < rows * cols; i++) if (!banned.has(i)) pool.push(i);

  const mineAt = new Set<number>();
  for (let m = 0; m < mines; m++) {
    const j = m + Math.floor(random() * (pool.length - m));
    [pool[m], pool[j]] = [pool[j], pool[m]];
    mineAt.add(pool[m]);
  }
  return mineAt;
}

function withMines(game: Game, mineAt: Set<number>): Cell[] {
  return game.cells.map((cell, i) => ({
    ...cell,
    mine: mineAt.has(i),
    n: neighbors(i, game.rows, game.cols).filter((k) => mineAt.has(k)).length,
  }));
}

/** A board with known mines and `start` already open, so every player gets the same game. */
export function createFixedGame(config: BoardConfig, mineAt: Set<number>, start: number): Game {
  const blank = createGame(config);
  const cells = withMines(blank, mineAt);
  const opened = floodOpen(blank, cells, start);
  return { ...blank, cells, opened, placed: true };
}

/** Opens cells in place on `cells`, which the caller must already own. */
function floodOpen(game: Game, cells: Cell[], start: number): number {
  let opened = 0;
  const stack = [start];
  while (stack.length) {
    const j = stack.pop() as number;
    const cell = cells[j];
    if (cell.open || cell.flag) continue;
    cells[j] = { ...cell, open: true };
    opened++;
    if (cell.n === 0) stack.push(...neighbors(j, game.rows, game.cols));
  }
  return opened;
}

export function reveal(game: Game, i: number, random: () => number = Math.random): Game {
  if (game.status === "won" || game.status === "lost") return game;
  if (game.cells[i].open || game.cells[i].flag) return game;

  const cells = game.placed ? game.cells.slice() : withMines(game, chooseMines(game, i, random));

  if (cells[i].mine) {
    cells.forEach((cell, j) => {
      if (cell.mine && !cell.flag) cells[j] = { ...cell, open: true };
    });
    return { ...game, cells, status: "lost", boom: i, placed: true };
  }

  const opened = game.opened + floodOpen(game, cells, i);
  if (opened === cells.length - game.mines) {
    cells.forEach((cell, j) => {
      if (cell.mine && !cell.flag) cells[j] = { ...cell, flag: true };
    });
    return { ...game, cells, opened, status: "won", flags: game.mines, placed: true };
  }
  return { ...game, cells, opened, status: "playing", placed: true };
}

export function toggleFlag(game: Game, i: number): Game {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.cells[i];
  if (cell.open) return game;
  const cells = game.cells.slice();
  cells[i] = { ...cell, flag: !cell.flag };
  return { ...game, cells, flags: game.flags + (cell.flag ? -1 : 1) };
}

/** Clicking a number whose surrounding flags already match it opens the rest around it. */
export function chord(game: Game, i: number): Game {
  if (game.status === "won" || game.status === "lost") return game;
  const cell = game.cells[i];
  if (!cell.open || cell.n === 0) return game;
  const around = neighbors(i, game.rows, game.cols);
  if (around.filter((k) => game.cells[k].flag).length !== cell.n) return game;
  return around.reduce((next, k) => reveal(next, k), game);
}

export function applyMove(game: Game, { type, i }: Move): Game {
  if (type === "reveal") return reveal(game, i);
  if (type === "flag") return toggleFlag(game, i);
  return chord(game, i);
}
