import { describe, expect, it } from "vitest";
import {
  computeStats,
  createDailyGame,
  DAILY_CONFIG,
  DailyResults,
  msUntilNextWave,
  percentCleared,
  replayMoves,
  shareText,
  solvableWithoutGuessing,
  utcDate,
  waveNumber,
} from "./daily";
import { createFixedGame, Game, Move } from "./engine";

const dateAt = (offset: number) => utcDate(new Date(Date.UTC(2026, 9, 31 + offset)));
const minesOf = (game: Game) => game.cells.flatMap((cell, i) => (cell.mine ? [i] : []));

describe("createDailyGame", () => {
  it("gives the same board for the same date", () => {
    expect(createDailyGame("2026-11-05")).toEqual(createDailyGame("2026-11-05"));
  });

  it("gives a different board each day", () => {
    const seen = new Set<string>();
    for (let d = 0; d < 60; d++) seen.add(minesOf(createDailyGame(dateAt(d))).join());
    expect(seen.size).toBe(60);
  });

  it("keeps these boards unchanged, because results are replayed against them", () => {
    expect(minesOf(createDailyGame("2026-10-31"))).toMatchSnapshot();
    expect(minesOf(createDailyGame("2027-06-15"))).toMatchSnapshot();
  });

  it("makes a full year of valid boards that never need a guess", () => {
    for (let d = 0; d < 365; d++) {
      const game = createDailyGame(dateAt(d));
      expect(minesOf(game)).toHaveLength(DAILY_CONFIG.mines);
      expect(game.cells.some((cell) => cell.open && cell.mine)).toBe(false);
      expect(game.opened).toBeGreaterThan(0);
      expect(game.status).toBe("ready");
      expect(solvableWithoutGuessing(game)).toBe(true);
    }
  });
});

describe("solvableWithoutGuessing", () => {
  it("accepts a board logic can finish", () => {
    // The 1 beside cell 2 proves it's the only mine, so cells 3 and 4 must be safe.
    const game = createFixedGame({ rows: 1, cols: 5, mines: 1 }, new Set([2]), 0);
    expect(solvableWithoutGuessing(game)).toBe(true);
  });

  it("rejects a true 50/50", () => {
    // One mine sits in the left column's cells 0 and 4, and nothing can tell them apart.
    const game = createFixedGame({ rows: 2, cols: 4, mines: 1 }, new Set([0]), 3);
    expect(solvableWithoutGuessing(game)).toBe(false);
  });
});

describe("dates", () => {
  it("numbers waves from launch day", () => {
    expect(waveNumber("2026-10-31")).toBe(1);
    expect(waveNumber("2026-11-01")).toBe(2);
    expect(waveNumber("2027-10-31")).toBe(366);
  });

  it("counts down to the next UTC midnight", () => {
    expect(msUntilNextWave(new Date("2026-10-31T23:59:59.000Z"))).toBe(1000);
    expect(msUntilNextWave(new Date("2026-10-31T00:00:00.000Z"))).toBe(86_400_000);
  });
});

describe("replayMoves", () => {
  it("rebuilds a game exactly from its moves, flags included", () => {
    const base = createDailyGame("2026-11-02");
    const mine = minesOf(base)[0];
    const safe = base.cells.findIndex((cell) => !cell.open && !cell.mine);
    const moves: Move[] = [
      { type: "flag", i: mine },
      { type: "reveal", i: safe },
    ];
    const game = replayMoves(base, moves);
    expect(game.cells[mine].flag).toBe(true);
    expect(game.cells[safe].open).toBe(true);
    expect(replayMoves(base, moves)).toEqual(game);
  });

  it("wins when every safe cell is revealed", () => {
    const base = createDailyGame("2026-11-03");
    const moves = base.cells.flatMap((cell, i): Move[] => (cell.mine ? [] : [{ type: "reveal", i }]));
    expect(replayMoves(base, moves).status).toBe("won");
  });

  it("does not change the starting game", () => {
    const base = createDailyGame("2026-11-04");
    const before = JSON.stringify(base);
    replayMoves(base, [{ type: "reveal", i: minesOf(base)[0] }]);
    expect(JSON.stringify(base)).toBe(before);
  });
});

describe("percentCleared", () => {
  const base = createDailyGame("2026-11-05");

  it("starts at 0 and only reaches 100 on a win", () => {
    expect(percentCleared(base, base.opened)).toBe(0);
    const moves = base.cells.flatMap((cell, i): Move[] => (cell.mine ? [] : [{ type: "reveal", i }]));
    expect(percentCleared(replayMoves(base, moves), base.opened)).toBe(100);
    const almost = replayMoves(base, moves.slice(0, -1).filter((m) => !base.cells[m.i].open));
    if (almost.status !== "won") expect(percentCleared(almost, base.opened)).toBeLessThan(100);
  });
});

describe("computeStats", () => {
  const win = { won: true, ms: 1000, percent: 100 };
  const loss = { won: false, ms: 1000, percent: 40 };

  it("is empty with no results", () => {
    expect(computeStats({}, "2026-11-10")).toEqual({ played: 0, won: 0, streak: 0, bestStreak: 0 });
  });

  it("counts consecutive wins through today", () => {
    const results: DailyResults = { "2026-11-08": win, "2026-11-09": win, "2026-11-10": win };
    expect(computeStats(results, "2026-11-10")).toMatchObject({ streak: 3, bestStreak: 3, played: 3, won: 3 });
  });

  it("keeps a streak alive before today's wave is played", () => {
    expect(computeStats({ "2026-11-08": win, "2026-11-09": win }, "2026-11-10").streak).toBe(2);
  });

  it("ends a streak on a loss today or a missed day", () => {
    expect(computeStats({ "2026-11-09": win, "2026-11-10": loss }, "2026-11-10").streak).toBe(0);
    expect(computeStats({ "2026-11-07": win }, "2026-11-10").streak).toBe(0);
  });

  it("remembers the best streak after one ends, and doesn't bridge missed days", () => {
    const results: DailyResults = {
      "2026-11-01": win,
      "2026-11-02": win,
      "2026-11-03": win,
      "2026-11-04": loss,
      "2026-11-06": win,
      "2026-11-08": win,
    };
    expect(computeStats(results, "2026-11-08")).toMatchObject({ streak: 1, bestStreak: 3, played: 6, won: 5 });
  });

  it("works across a month and year boundary", () => {
    const results: DailyResults = { "2026-12-31": win, "2027-01-01": win };
    expect(computeStats(results, "2027-01-01").streak).toBe(2);
  });
});

describe("shareText", () => {
  it("shows the time and a full bar for a win", () => {
    const text = shareText("2026-11-01", { won: true, ms: 83400, percent: 100 }, 3, "https://example.com");
    expect(text).toBe(
      "🌊 Minesurfer Daily Wave #2\nRode it in: 1:23.4s\n🟦🟦🟦🟦🟦🟦🟦🟦🟦🏄\n🔥 3-day streak\nhttps://example.com",
    );
  });

  it("shows where the ride ended for a loss, and no streak line", () => {
    const text = shareText("2026-10-31", { won: false, ms: 5000, percent: 62 }, 0, "https://example.com");
    expect(text).toBe(
      "🌊 Minesurfer Daily Wave #1\nWiped out at 62%\n🟦🟦🟦🟦🟦🟦🦈⬜⬜⬜\nhttps://example.com",
    );
  });
});
