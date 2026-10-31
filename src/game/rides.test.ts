import { describe, expect, it } from "vitest";
import { createDailyGame } from "./daily";
import { Move } from "./engine";
import { checkRide, handleProblem, isWaveDate, officialMs, parseMoves, withRanks } from "./rides";

const DATE = "2026-11-03";
const base = createDailyGame(DATE);
const winning = base.cells.flatMap((cell, i): Move[] => (cell.mine || cell.open ? [] : [{ type: "reveal", i }]));
const shark = base.cells.findIndex((cell) => cell.mine);

/** Reveals one at a time, stopping when the board is cleared (a reveal can open a whole area). */
function shortestWin(): Move[] {
  for (let n = 1; n <= winning.length; n++) {
    if (checkRide(DATE, winning.slice(0, n))) return winning.slice(0, n);
  }
  throw new Error("never won");
}

describe("checkRide", () => {
  it("accepts a real win", () => {
    expect(checkRide(DATE, shortestWin())).toEqual({ won: true, percent: 100 });
  });

  it("records a wipeout with how far it got", () => {
    const result = checkRide(DATE, [{ type: "reveal", i: shark }]);
    expect(result).toEqual({ won: false, percent: 0 });
  });

  it("rejects moves that don't finish the board", () => {
    expect(checkRide(DATE, [])).toBeNull();
    const win = shortestWin();
    expect(checkRide(DATE, win.slice(0, -1))).toBeNull();
  });

  it("rejects moves padded after the finish", () => {
    const win = shortestWin();
    expect(checkRide(DATE, [...win, { type: "flag", i: 0 }])).toBeNull();
  });

  it("rejects a winning log from another day", () => {
    const result = checkRide("2026-11-04", shortestWin());
    expect(result?.won ?? false).toBe(false);
  });
});

describe("parseMoves", () => {
  it("keeps valid moves and drops extra fields", () => {
    expect(parseMoves([{ type: "flag", i: 3, x: 1 }], 144)).toEqual([{ type: "flag", i: 3 }]);
  });

  it.each([
    ["not a list", "nope"],
    ["an unknown type", [{ type: "win", i: 0 }]],
    ["a cell off the board", [{ type: "reveal", i: 144 }]],
    ["a negative cell", [{ type: "reveal", i: -1 }]],
    ["a fractional cell", [{ type: "reveal", i: 1.5 }]],
    ["an empty entry", [null]],
    ["too many moves", Array(5001).fill({ type: "flag", i: 0 })],
  ])("rejects %s", (_, value) => {
    expect(parseMoves(value, 144)).toBeNull();
  });
});

describe("officialMs", () => {
  it("keeps the player's time when it's just under the server's", () => {
    expect(officialMs(83_400, 84_100)).toBe(83_400);
  });

  it("can't be cut by more than the allowance", () => {
    expect(officialMs(1000, 60_000)).toBe(58_000);
  });

  it("never exceeds the server's time", () => {
    expect(officialMs(90_000, 60_000)).toBe(60_000);
  });

  it("falls back to the server's time for junk", () => {
    expect(officialMs("fast", 60_000)).toBe(60_000);
    expect(officialMs(Number.NaN, 60_000)).toBe(60_000);
    expect(officialMs(-5, 500)).toBe(0);
  });
});

describe("handleProblem", () => {
  it("accepts ordinary names", () => {
    expect(handleProblem("Kelly_S-11")).toBeNull();
  });

  it.each(["ab", "a".repeat(17), "has space", "<script>", "ADMIN", 42, null])("rejects %s", (handle) => {
    expect(handleProblem(handle)).not.toBeNull();
  });
});

describe("isWaveDate", () => {
  it("only accepts real dates", () => {
    expect(isWaveDate("2026-11-03")).toBe(true);
    expect(isWaveDate("2026-13-03")).toBe(false);
    expect(isWaveDate("yesterday")).toBe(false);
    expect(isWaveDate(20261103)).toBe(false);
  });
});

describe("withRanks", () => {
  it("shares a rank on ties and skips past them", () => {
    const rows = [{ ms: 100 }, { ms: 200 }, { ms: 200 }, { ms: 300 }];
    expect(withRanks(rows).map((row) => row.rank)).toEqual([1, 2, 2, 4]);
  });
});
