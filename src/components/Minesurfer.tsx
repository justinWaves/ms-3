"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chord, createGame, Difficulty, DIFFICULTIES, Game, reveal, toggleFlag } from "@/game/engine";
import Board from "./Board";
import { FaceState, Fin, Stopwatch, SunFace, SunLogo, Surfboard } from "./Icons";

const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as Difficulty[];
const WIN_LINES = ["Totally Tubular!", "Shredding It!", "Epic Wave!", "Stoked, Dude!", "Perfect Pipeline!"];
const LOSE_LINES = ["Wiped Out!", "Epic Fail!", "Shark Attack!", "Bailed Out!", "Rough Seas!", "Crashed & Burned!"];

const MIN_CELL = 24;
const MAX_CELL = 40;
const GAP = 2;
/** Height taken by everything around the board, used to keep it on screen. */
const BOARD_CHROME_HEIGHT = 300;

type Bests = Partial<Record<Difficulty, number>>;

function readStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private windows can refuse storage; the game still works without it.
  }
}

function formatTime(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return seconds.toFixed(1);
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)];

/** Holds its own ticking state, so the board doesn't re-render ten times a second. */
function Clock({ startedAt, stoppedMs }: { startedAt: number | null; stoppedMs: number | null }) {
  const [now, setNow] = useState(0);
  const running = startedAt !== null && stoppedMs === null;

  useEffect(() => {
    if (!running) return;
    setNow(performance.now());
    const id = setInterval(() => setNow(performance.now()), 100);
    return () => clearInterval(id);
  }, [running]);

  const ms = stoppedMs ?? (startedAt === null ? 0 : Math.max(0, now - startedAt));
  return <strong>{formatTime(ms)}</strong>;
}

export default function Minesurfer() {
  const [difficulty, setDifficulty] = useState<Difficulty>("ankle");
  const [game, setGame] = useState<Game>(() => createGame(DIFFICULTIES.ankle));
  const [round, setRound] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [stoppedMs, setStoppedMs] = useState<number | null>(null);
  const [cellSize, setCellSize] = useState(32);
  const [pressing, setPressing] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [bests, setBests] = useState<Bests>({});
  const [resultLine, setResultLine] = useState("");
  const [newBest, setNewBest] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback((key: Difficulty) => {
    const { rows, cols, mines } = DIFFICULTIES[key];
    const width = scrollRef.current?.clientWidth ?? Infinity;
    // Wide boards turn on their side when they wouldn't fit across the screen.
    const turn = cols > rows && width < cols * (MIN_CELL + GAP) + 8;
    setGame(createGame(turn ? { rows: cols, cols: rows, mines } : { rows, cols, mines }));
    setDifficulty(key);
    setRound((r) => r + 1);
    setStartedAt(null);
    setStoppedMs(null);
    setNewBest(false);
    writeStored("ms-difficulty", key);
  }, []);

  // Browser-only setup happens after mount so the server and client first render match.
  useEffect(() => {
    setBests(readStored<Bests>("ms-bests", {}));
    setCoarse(matchMedia("(pointer: coarse)").matches);
    const saved = readStored<Difficulty>("ms-difficulty", "ankle");
    startGame(DIFFICULTY_KEYS.includes(saved) ? saved : "ankle");

    const root = document.documentElement;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setIsDark(root.dataset.theme ? root.dataset.theme === "dark" : media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [startGame]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const resize = () => {
      const fitWidth = Math.floor((el.clientWidth - 8 - (game.cols + 1) * GAP) / game.cols);
      const fitHeight = Math.floor((window.innerHeight - BOARD_CHROME_HEIGHT) / game.rows) - GAP;
      setCellSize(Math.max(MIN_CELL, Math.min(MAX_CELL, fitWidth, fitHeight)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [game.rows, game.cols]);

  const apply = (next: Game) => {
    if (next === game) return;
    const now = performance.now();
    const began = startedAt ?? now;
    if (game.status === "ready" && next.status !== "ready") setStartedAt(began);

    if (next.status === "won" || next.status === "lost") {
      const elapsed = now - began;
      setStoppedMs(elapsed);
      setResultLine(pick(next.status === "won" ? WIN_LINES : LOSE_LINES));
      if (next.status === "won") {
        const tenths = Math.round(elapsed / 100) * 100;
        const previous = bests[difficulty];
        if (previous === undefined || tenths < previous) {
          const updated = { ...bests, [difficulty]: tenths };
          setBests(updated);
          writeStored("ms-bests", updated);
          setNewBest(true);
        }
      }
    }
    setGame(next);
  };

  const handleOpen = (i: number) => {
    const cell = game.cells[i];
    if (cell.open) apply(chord(game, i));
    else apply(flagMode ? toggleFlag(game, i) : reveal(game, i));
  };

  const handleFlag = (i: number) => {
    apply(game.cells[i].open ? chord(game, i) : toggleFlag(game, i));
  };

  const toggleTheme = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setIsDark(!isDark);
    try {
      localStorage.setItem("ms-theme", next);
    } catch {
      // The choice just won't carry over to the next visit.
    }
  };

  const ended = game.status === "won" || game.status === "lost";
  const face: FaceState =
    game.status === "won" ? "win" : game.status === "lost" ? "lose" : pressing && !flagMode ? "gasp" : "play";
  const boomRow = game.boom === null ? 0 : Math.floor(game.boom / game.cols) + 1;
  const boomCol = game.boom === null ? 0 : (game.boom % game.cols) + 1;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <SunLogo />
          <div>
            <h1>Minesurfer</h1>
            <p>Read the water. Dodge the sharks.</p>
          </div>
        </div>
        <div className="controls">
          <div className="diffs" role="group" aria-label="Wave size">
            {DIFFICULTY_KEYS.map((key) => {
              const d = DIFFICULTIES[key];
              return (
                <button key={key} type="button" aria-pressed={key === difficulty} onClick={() => startGame(key)}>
                  <b>{d.name}</b>
                  <span>
                    {d.cols}×{d.rows} · {d.mines} sharks
                  </span>
                </button>
              );
            })}
          </div>
          <button className="chip" type="button" onClick={toggleTheme}>
            {isDark ? "Day session" : "Night session"}
          </button>
        </div>
      </header>

      <main className="main">
        <section className="board-card" aria-label="Game">
          <div className="status">
            <div className="stat">
              <Surfboard />
              <div>
                <small>Sharks left</small>
                <strong>{game.mines - game.flags}</strong>
              </div>
            </div>
            <button
              className="face"
              type="button"
              data-face={face}
              aria-label="New game"
              onClick={() => startGame(difficulty)}
            >
              <SunFace />
            </button>
            <div className="stat">
              <div>
                <small>Time</small>
                <Clock startedAt={startedAt} stoppedMs={stoppedMs} />
              </div>
              <Stopwatch />
            </div>
          </div>

          <div className="board-scroll" ref={scrollRef}>
            <Board
              key={round}
              game={game}
              cellSize={cellSize}
              onOpen={handleOpen}
              onFlag={handleFlag}
              onPressChange={setPressing}
            />
          </div>

          <div className="foot">
            <p className={`msg${ended ? ` ${game.status}` : ""}`} aria-live="polite">
              {game.status === "won" && (
                <>
                  <b>{resultLine}</b>
                  {formatTime(stoppedMs ?? 0)}s on {DIFFICULTIES[difficulty].name}
                  {newBest && " · new personal best"}
                </>
              )}
              {game.status === "lost" && (
                <>
                  <b>{resultLine}</b>A shark was waiting at row {boomRow}, column {boomCol}.
                </>
              )}
              {!ended &&
                (coarse
                  ? "Tap to reveal. Long-press to drop a board. Tap a number to clear around it."
                  : "Click to reveal. Right-click or press F to drop a board. Click a number to clear around it.")}
            </p>
            {ended ? (
              <button className="btn" type="button" onClick={() => startGame(difficulty)}>
                {game.status === "won" ? "Paddle out again" : "Try again"}
              </button>
            ) : (
              <button
                className="btn toggle"
                type="button"
                aria-pressed={flagMode}
                onClick={() => setFlagMode(!flagMode)}
              >
                Board mode: {flagMode ? "on" : "off"}
              </button>
            )}
          </div>
        </section>

        <aside className="side">
          <section className="panel" aria-labelledby="bests-heading">
            <h2 id="bests-heading">Your best times</h2>
            <ol className="ranks">
              {DIFFICULTY_KEYS.map((key) => (
                <li key={key} className={key === difficulty ? "you" : undefined}>
                  <span className="nm">{DIFFICULTIES[key].name}</span>
                  <span className="tm">{bests[key] === undefined ? "–" : `${formatTime(bests[key])}s`}</span>
                </li>
              ))}
            </ol>
            <p className="note">Saved in this browser. Global rankings are coming.</p>
          </section>

          <section className="panel" aria-labelledby="key-heading">
            <h2 id="key-heading">Reading the water</h2>
            <div className="key">
              <div>
                <span className="cell" aria-hidden="true" />
                <span>Unread water</span>
              </div>
              <div>
                <span className="cell open n2" aria-hidden="true">
                  2
                </span>
                <span>Sharks nearby</span>
              </div>
              <div>
                <span className="cell" aria-hidden="true">
                  <Surfboard />
                </span>
                <span>Your board</span>
              </div>
              <div>
                <span className="cell open mine boom" aria-hidden="true">
                  <Fin />
                </span>
                <span>Wipeout</span>
              </div>
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
