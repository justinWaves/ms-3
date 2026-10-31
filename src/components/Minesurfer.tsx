"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  computeStats,
  createDailyGame,
  DAILY_CONFIG,
  DailyResults,
  formatTime,
  msUntilNextWave,
  percentCleared,
  replayMoves,
  shareText,
  utcDate,
  waveNumber,
} from "@/game/daily";
import { applyMove, createGame, Difficulty, DIFFICULTIES, Game, Move, MoveType } from "@/game/engine";
import { sendRide, sendUnsentRide, startRide } from "@/lib/rides";
import { useAccount } from "@/lib/useAccount";
import { AccountDialog, HandleDialog, SignInDialog } from "./Account";
import Board from "./Board";
import { FaceState, Fin, Stopwatch, SunFace, SunLogo, Surfboard } from "./Icons";
import Rankings from "./Rankings";

const DIFFICULTY_KEYS = Object.keys(DIFFICULTIES) as Difficulty[];
const WIN_LINES = ["Totally Tubular!", "Shredding It!", "Epic Wave!", "Stoked, Dude!", "Perfect Pipeline!"];
const LOSE_LINES = ["Wiped Out!", "Epic Fail!", "Shark Attack!", "Bailed Out!", "Rough Seas!", "Crashed & Burned!"];

const MIN_CELL = 22;
const MAX_CELL = 40;
const GAP = 2;
/** Height taken by everything around the board, used to keep it on screen. */
const BOARD_CHROME_HEIGHT = 300;
const COPIED_MS = 2000;

const BESTS_KEY = "ms-bests";
const DIFFICULTY_KEY = "ms-difficulty";
const DAILY_RESULTS_KEY = "ms-daily-results";
const DAILY_RUN_KEY = "ms-daily-run";

type Bests = Partial<Record<Difficulty, number>>;
type Mode = "daily" | "free";
type Dialog = "signin" | "signin-failed" | "handle" | "account" | null;

/** A daily ride in progress. Saved after every move, so reloading can't buy a second attempt. */
interface DailyRun {
  date: string;
  /** Wall-clock start, so the time keeps running through a reload. */
  startedAt: number;
  openedAtStart: number;
  moves: Move[];
  /** The server started the clock, so this ride goes in the rankings. */
  ranked?: boolean;
}

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

function removeStored(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

const pick = (lines: string[]) => lines[Math.floor(Math.random() * lines.length)];
const roundToTenths = (ms: number) => Math.round(ms / 100) * 100;

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

function NextWave() {
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setMs(msUntilNextWave());
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (ms === null) return <strong>–</strong>;
  const total = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <strong>
      {pad(Math.floor(total / 3600))}:{pad(Math.floor(total / 60) % 60)}:{pad(total % 60)}
    </strong>
  );
}

export default function Minesurfer() {
  const [mode, setMode] = useState<Mode>("daily");
  const [difficulty, setDifficulty] = useState<Difficulty>("ankle");
  const [game, setGame] = useState<Game>(() => createGame(DAILY_CONFIG));
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
  /** Null until mounted: the page is prerendered, so the build can't know today's date. */
  const [today, setToday] = useState<string | null>(null);
  const [shownDate, setShownDate] = useState<string | null>(null);
  const [results, setResults] = useState<DailyResults>({});
  const [awaitingStart, setAwaitingStart] = useState(true);
  const [copied, setCopied] = useState(false);
  const [shareFallback, setShareFallback] = useState<string | null>(null);
  const { account, setHandle, signOut } = useAccount();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [starting, setStarting] = useState(false);
  const [rankingsVersion, setRankingsVersion] = useState(0);
  const [rideNote, setRideNote] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const runRef = useRef<DailyRun | null>(null);

  const resetRound = () => {
    setRound((r) => r + 1);
    setNewBest(false);
    setRideNote(null);
    setShareFallback(null);
    setCopied(false);
  };

  const startGame = useCallback((key: Difficulty) => {
    const { rows, cols, mines } = DIFFICULTIES[key];
    const width = scrollRef.current?.clientWidth ?? Infinity;
    // Wide boards turn on their side when they wouldn't fit across the screen.
    const turn = cols > rows && width < cols * (MIN_CELL + GAP) + 8;
    setGame(createGame(turn ? { rows: cols, cols: rows, mines } : { rows, cols, mines }));
    setMode("free");
    setDifficulty(key);
    setAwaitingStart(false);
    resetRound();
    setStartedAt(null);
    setStoppedMs(null);
    runRef.current = null;
    writeStored(DIFFICULTY_KEY, key);
  }, []);

  /** Shows today's wave: the finished board, the ride in progress, or the start screen. */
  const showDaily = useCallback(() => {
    const date = utcDate();
    const stored = readStored<DailyResults>(DAILY_RESULTS_KEY, {});
    const finished = stored[date];
    const saved = readStored<DailyRun | null>(DAILY_RUN_KEY, null);

    setMode("daily");
    setToday(date);
    setShownDate(date);
    setResults(stored);
    resetRound();

    if (finished) {
      runRef.current = null;
      setGame(replayMoves(createDailyGame(date), finished.moves ?? []));
      setStartedAt(null);
      setStoppedMs(finished.ms);
      setResultLine(finished.won ? "Rode it in!" : "Wiped Out!");
      setAwaitingStart(false);
    } else if (saved?.date === date) {
      runRef.current = saved;
      setGame(replayMoves(createDailyGame(date), saved.moves));
      setStartedAt(performance.now() - (Date.now() - saved.startedAt));
      setStoppedMs(null);
      setAwaitingStart(false);
    } else {
      runRef.current = null;
      setGame(createGame(DAILY_CONFIG));
      setStartedAt(null);
      setStoppedMs(null);
      setAwaitingStart(true);
    }
  }, []);

  const paddleOut = async () => {
    if (account.status === "in" && !account.handle) return setDialog("handle");

    let date = utcDate();
    let elapsedMs = 0;
    let ranked = false;
    let note = account.status === "unreachable" ? "We couldn't reach the rankings, so this ride won't be ranked." : null;
    if (account.status === "in") {
      setStarting(true);
      const ride = await startRide();
      setStarting(false);
      if (ride?.finished) {
        // Already ridden on another device: show that result instead.
        const stored = readStored<DailyResults>(DAILY_RESULTS_KEY, {});
        writeStored(DAILY_RESULTS_KEY, { ...stored, [ride.date]: ride.finished });
        return showDaily();
      }
      if (ride) {
        date = ride.date;
        elapsedMs = ride.elapsedMs;
        ranked = true;
      } else {
        note = "We couldn't reach the rankings, so this ride won't be ranked.";
      }
    }

    const base = createDailyGame(date);
    const run: DailyRun = { date, startedAt: Date.now() - elapsedMs, openedAtStart: base.opened, moves: [], ranked };
    runRef.current = run;
    writeStored(DAILY_RUN_KEY, run);
    setShownDate(date);
    setGame(base);
    setStartedAt(performance.now() - elapsedMs);
    setStoppedMs(null);
    setAwaitingStart(false);
    resetRound();
    setRideNote(note);
  };

  // Browser-only setup happens after mount so the server and client first render match.
  useEffect(() => {
    setBests(readStored<Bests>(BESTS_KEY, {}));
    setCoarse(matchMedia("(pointer: coarse)").matches);

    // Land on today's wave until it's been ridden, then on the player's usual board.
    const date = utcDate();
    if (readStored<DailyResults>(DAILY_RESULTS_KEY, {})[date]) {
      const saved = readStored<Difficulty>(DIFFICULTY_KEY, "ankle");
      setToday(date);
      setResults(readStored<DailyResults>(DAILY_RESULTS_KEY, {}));
      startGame(DIFFICULTY_KEYS.includes(saved) ? saved : "ankle");
    } else {
      showDaily();
    }

    const root = document.documentElement;
    const media = matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setIsDark(root.dataset.theme ? root.dataset.theme === "dark" : media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [startGame, showDaily]);

  // Returning from a failed sign-in link lands here with a marker in the URL.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("signin") !== "failed") return;
    setDialog("signin-failed");
    url.searchParams.delete("signin");
    window.history.replaceState(null, "", url);
  }, []);

  // New players pick a name as soon as they're in. A ride finished offline is sent now too.
  const signedIn = account.status === "in";
  const needsHandle = signedIn && !account.handle;
  useEffect(() => {
    if (needsHandle) setDialog("handle");
  }, [needsHandle]);

  useEffect(() => {
    if (!signedIn) return;
    void sendUnsentRide().then((sent) => {
      if (sent) setRankingsVersion((v) => v + 1);
    });
  }, [signedIn]);

  // Roll over at UTC midnight. A ride in progress finishes first, under the date it started.
  useEffect(() => {
    const id = setInterval(() => setToday(utcDate()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!today || mode !== "daily" || runRef.current || shownDate === today) return;
    showDaily();
  }, [today, mode, shownDate, showDaily]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const resize = () => {
      const fitWidth = Math.floor((el.clientWidth - (game.cols + 1) * GAP) / game.cols);
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

  const saveDailyMove = (run: DailyRun, move: Move, next: Game, elapsed: number) => {
    const moves = [...run.moves, move];
    if (next.status !== "won" && next.status !== "lost") {
      runRef.current = { ...run, moves };
      writeStored(DAILY_RUN_KEY, runRef.current);
      return;
    }
    // Only the latest board is ever shown again, so older days drop their moves.
    const stored = readStored<DailyResults>(DAILY_RESULTS_KEY, {});
    const trimmed = Object.fromEntries(
      Object.entries(stored).map(([date, { won, ms, percent }]) => [date, { won, ms, percent }]),
    );
    const updated: DailyResults = {
      ...trimmed,
      [run.date]: {
        won: next.status === "won",
        ms: roundToTenths(elapsed),
        percent: percentCleared(next, run.openedAtStart),
        moves,
      },
    };
    writeStored(DAILY_RESULTS_KEY, updated);
    removeStored(DAILY_RUN_KEY);
    if (run.ranked) {
      void sendRide({ date: run.date, moves, ms: elapsed }).then((sent) => {
        setRankingsVersion((v) => v + 1);
        if (!sent) setRideNote("We couldn't send this ride yet. We'll try again on your next visit.");
      });
    }
    runRef.current = null;
    setResults(updated);
  };

  const play = (move: Move) => {
    const next = applyMove(game, move);
    if (next === game) return;

    const now = performance.now();
    const began = startedAt ?? now;
    const elapsed = now - began;
    if (game.status === "ready" && next.status !== "ready") setStartedAt(began);

    if (next.status === "won" || next.status === "lost") {
      setStoppedMs(elapsed);
      setResultLine(pick(next.status === "won" ? WIN_LINES : LOSE_LINES));
      if (next.status === "won" && mode === "free") {
        const tenths = roundToTenths(elapsed);
        const previous = bests[difficulty];
        if (previous === undefined || tenths < previous) {
          const updated = { ...bests, [difficulty]: tenths };
          setBests(updated);
          writeStored(BESTS_KEY, updated);
          setNewBest(true);
        }
      }
    }
    if (mode === "daily" && runRef.current) saveDailyMove(runRef.current, move, next, elapsed);
    setGame(next);
  };

  const move = (type: MoveType, i: number) => play({ type, i });

  const handleOpen = (i: number) => {
    if (awaitingStart) return;
    if (game.cells[i].open) move("chord", i);
    else move(flagMode ? "flag" : "reveal", i);
  };

  const handleFlag = (i: number) => {
    if (awaitingStart) return;
    move(game.cells[i].open ? "chord" : "flag", i);
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
  const stats = computeStats(results, today ?? "1970-01-01");
  const dailyResult = shownDate ? results[shownDate] : undefined;
  const todayDone = today !== null && results[today] !== undefined;

  const shareResult = async () => {
    if (!shownDate || !dailyResult) return;
    const text = shareText(shownDate, dailyResult, stats.streak, window.location.origin);
    setShareFallback(null);
    // Phones get the system share sheet; everywhere else copies the text.
    if (coarse && navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    } catch {
      setShareFallback(text);
    }
  };

  return (
    <div className="app">
      {(dialog === "signin" || dialog === "signin-failed") && (
        <SignInDialog failed={dialog === "signin-failed"} onClose={() => setDialog(null)} />
      )}
      {dialog === "handle" && account.status === "in" && (
        <HandleDialog
          current={account.handle}
          onClose={() => setDialog(null)}
          onSaved={(handle) => {
            setHandle(handle);
            setDialog(null);
            setRankingsVersion((v) => v + 1);
          }}
        />
      )}
      {dialog === "account" && account.status === "in" && (
        <AccountDialog
          email={account.email}
          handle={account.handle}
          onRename={() => setDialog("handle")}
          onClose={() => setDialog(null)}
          onSignOut={() => {
            setDialog(null);
            void signOut();
          }}
          onDeleted={() => {
            setDialog(null);
            void signOut();
            setRankingsVersion((v) => v + 1);
          }}
        />
      )}
      <header className="top">
        <div className="brand">
          <SunLogo />
          <div>
            <h1>Minesurfer</h1>
            <p>Read the water. Dodge the sharks.</p>
          </div>
        </div>
        <div className="controls">
          <div className="diffs" role="group" aria-label="Choose a wave">
            <button type="button" className="daily" aria-pressed={mode === "daily"} onClick={showDaily}>
              <b>Daily Wave{today && ` #${waveNumber(today)}`}</b>
              <span>{todayDone ? "Ridden today ✓" : "One ride a day"}</span>
            </button>
            {DIFFICULTY_KEYS.map((key) => {
              const d = DIFFICULTIES[key];
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={mode === "free" && key === difficulty}
                  onClick={() => startGame(key)}
                >
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
          {account.status === "out" && (
            <button className="chip" type="button" onClick={() => setDialog("signin")}>
              Sign in
            </button>
          )}
          {account.status === "in" && (
            <button className="chip" type="button" onClick={() => setDialog("account")}>
              {account.handle ?? "Your account"}
            </button>
          )}
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
              disabled={mode === "daily"}
              aria-label={mode === "daily" ? "The Daily Wave can't be restarted" : "New game"}
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

          <div className="board-stage">
            <div className="board-scroll" ref={scrollRef} inert={awaitingStart}>
              <Board
                key={round}
                game={game}
                cellSize={cellSize}
                onOpen={handleOpen}
                onFlag={handleFlag}
                onPressChange={setPressing}
              />
            </div>
            {awaitingStart && (
              <div className="gate">
                <div className="gate-card">
                  <h2>Daily Wave{today && ` #${waveNumber(today)}`}</h2>
                  <p>Everyone rides the same board today, and no guessing is ever needed. You get one ride.</p>
                  <button
                    className="btn big"
                    type="button"
                    disabled={starting || account.status === "loading"}
                    onClick={paddleOut}
                  >
                    Paddle out
                  </button>
                  <p className="fine">The clock starts when you do, and it won&apos;t stop if you reload.</p>
                  {account.status === "out" && (
                    <p className="fine">
                      <button className="link" type="button" onClick={() => setDialog("signin")}>
                        Sign in first
                      </button>{" "}
                      to get this ride ranked.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="foot">
            <p className={`msg${ended ? ` ${game.status}` : ""}`} aria-live="polite">
              {game.status === "won" && (
                <>
                  <b>{resultLine}</b>
                  {formatTime(stoppedMs ?? 0)}s on {mode === "daily" ? "the Daily Wave" : DIFFICULTIES[difficulty].name}
                  {newBest && " · new personal best"}
                </>
              )}
              {game.status === "lost" && (
                <>
                  <b>{resultLine}</b>
                  {mode === "daily" && dailyResult
                    ? `You cleared ${dailyResult.percent}% before the shark at row ${boomRow}, column ${boomCol}.`
                    : `A shark was waiting at row ${boomRow}, column ${boomCol}.`}
                </>
              )}
              {!ended &&
                (coarse
                  ? "Tap to reveal. Long-press to drop a board. Tap a number to clear around it."
                  : "Click to reveal. Right-click or press F to drop a board. Click a number to clear around it.")}
            </p>
            {ended && mode === "daily" && (
              <button className="btn" type="button" onClick={shareResult}>
                {copied ? "Copied!" : "Share result"}
              </button>
            )}
            {ended && mode === "free" && (
              <button className="btn" type="button" onClick={() => startGame(difficulty)}>
                {game.status === "won" ? "Paddle out again" : "Try again"}
              </button>
            )}
            {!ended && (
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
          {rideNote && <p className="note ride-note">{rideNote}</p>}
          {shareFallback && (
            <label className="share-fallback">
              Copying was blocked. Select this text to share it:
              <textarea readOnly rows={5} value={shareFallback} />
            </label>
          )}
        </section>

        <aside className="side">
          <Rankings
            date={today}
            version={rankingsVersion}
            account={account}
            riddenHere={todayDone}
            onSignIn={() => setDialog("signin")}
          />

          <section className="panel" aria-labelledby="daily-heading">
            <h2 id="daily-heading">Daily Wave</h2>
            <dl className="tally">
              <div>
                <dt>Streak</dt>
                <dd>{stats.streak}</dd>
              </div>
              <div>
                <dt>Best streak</dt>
                <dd>{stats.bestStreak}</dd>
              </div>
              <div>
                <dt>Rides</dt>
                <dd>{stats.played}</dd>
              </div>
              <div>
                <dt>Rode in</dt>
                <dd>{stats.won}</dd>
              </div>
            </dl>
            <p className="next-wave">
              <span>Next wave in</span>
              <NextWave />
            </p>
          </section>

          <section className="panel" aria-labelledby="bests-heading">
            <h2 id="bests-heading">Your best times</h2>
            <ol className="ranks">
              {DIFFICULTY_KEYS.map((key) => (
                <li key={key} className={mode === "free" && key === difficulty ? "you" : undefined}>
                  <span className="nm">{DIFFICULTIES[key].name}</span>
                  <span className="tm">{bests[key] === undefined ? "–" : `${formatTime(bests[key])}s`}</span>
                </li>
              ))}
            </ol>
            <p className="note">Saved in this browser.</p>
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
