import { describe, expect, it } from "vitest";
import { chord, createGame, DIFFICULTIES, Game, neighbors, reveal, toggleFlag } from "./engine";

/** Small repeatable random source, so failures can be reproduced. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Builds a mid-game board with mines exactly where the test says. */
function boardWithMines(rows: number, cols: number, mineAt: number[]): Game {
  const cells = Array.from({ length: rows * cols }, (_, i) => ({
    mine: mineAt.includes(i),
    n: neighbors(i, rows, cols).filter((k) => mineAt.includes(k)).length,
    open: false,
    flag: false,
  }));
  return { rows, cols, mines: mineAt.length, cells, status: "playing", flags: 0, opened: 0, boom: null };
}

describe("first reveal", () => {
  for (const [key, config] of Object.entries(DIFFICULTIES)) {
    it(`${key}: places every mine and never under or next to the first click`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const first = (seed * 37) % (config.rows * config.cols);
        const game = reveal(createGame(config), first, seeded(seed));
        expect(game.cells.filter((c) => c.mine)).toHaveLength(config.mines);
        expect(game.cells[first].mine).toBe(false);
        expect(game.cells[first].n).toBe(0);
        expect(game.status).toBe("playing");
      }
    });
  }

  it("counts neighboring mines correctly", () => {
    const game = reveal(createGame(DIFFICULTIES.ankle), 40, seeded(7));
    game.cells.forEach((cell, i) => {
      const expected = neighbors(i, game.rows, game.cols).filter((k) => game.cells[k].mine).length;
      expect(cell.n).toBe(expected);
    });
  });
});

describe("reveal", () => {
  it("floods through empty cells and stops at numbers", () => {
    const game = reveal(boardWithMines(3, 3, [8]), 0);
    expect(game.cells.filter((c) => c.open)).toHaveLength(8);
    expect(game.status).toBe("won");
  });

  it("does not open flagged cells during a flood", () => {
    let game = boardWithMines(3, 3, [8]);
    game = toggleFlag(game, 1);
    game = reveal(game, 0);
    expect(game.cells[1].open).toBe(false);
    expect(game.status).toBe("playing");
  });

  it("ignores a click on a flag", () => {
    const game = toggleFlag(boardWithMines(3, 3, [8]), 8);
    expect(reveal(game, 8)).toBe(game);
  });

  it("loses on a mine, showing unflagged mines and keeping flagged ones", () => {
    let game = boardWithMines(3, 3, [0, 8]);
    game = toggleFlag(game, 8);
    game = reveal(game, 0);
    expect(game.status).toBe("lost");
    expect(game.boom).toBe(0);
    expect(game.cells[0].open).toBe(true);
    expect(game.cells[8].open).toBe(false);
    expect(game.cells[8].flag).toBe(true);
  });

  it("flags all remaining mines on a win", () => {
    const game = reveal(boardWithMines(3, 3, [8]), 0);
    expect(game.cells[8].flag).toBe(true);
    expect(game.flags).toBe(1);
  });

  it("does nothing once the game has ended", () => {
    const lost = reveal(boardWithMines(3, 3, [0]), 0);
    expect(reveal(lost, 4)).toBe(lost);
    expect(toggleFlag(lost, 4)).toBe(lost);
  });

  it("only copies the cells that changed", () => {
    const before = boardWithMines(3, 3, [0, 8]);
    const after = reveal(before, 1);
    expect(after.cells[1]).not.toBe(before.cells[1]);
    expect(after.cells[4]).toBe(before.cells[4]);
  });
});

describe("toggleFlag", () => {
  it("adds and removes a flag and keeps count", () => {
    let game = boardWithMines(3, 3, [8]);
    game = toggleFlag(game, 8);
    expect(game.flags).toBe(1);
    game = toggleFlag(game, 8);
    expect(game.flags).toBe(0);
    expect(game.cells[8].flag).toBe(false);
  });
});

describe("chord", () => {
  it("opens the rest when the flags match the number", () => {
    let game = boardWithMines(2, 3, [0, 2]);
    game = reveal(game, 1);
    game = toggleFlag(game, 0);
    game = toggleFlag(game, 2);
    game = chord(game, 1);
    expect(game.status).toBe("won");
  });

  it("does nothing when the flags do not match", () => {
    let game = boardWithMines(3, 3, [0, 2]);
    game = reveal(game, 1);
    game = toggleFlag(game, 0);
    expect(chord(game, 1)).toBe(game);
  });

  it("loses when a misplaced flag leaves a mine exposed", () => {
    let game = boardWithMines(3, 3, [0]);
    game = reveal(game, 1);
    game = toggleFlag(game, 3);
    game = chord(game, 1);
    expect(game.status).toBe("lost");
    expect(game.boom).toBe(0);
  });
});
