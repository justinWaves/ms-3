"use client";

import { useEffect, useState } from "react";
import { formatTime, waveNumber } from "@/game/daily";
import { Account } from "@/lib/useAccount";

interface Board {
  date: string;
  riders: number;
  top: { rank: number; handle: string; ms: number; you: boolean }[];
  me: { finished: boolean; won: boolean | null; ms: number | null; percent: number | null; rank: number | null } | null;
}

export default function Rankings({
  date,
  version,
  account,
  riddenHere,
  onSignIn,
}: {
  date: string | null;
  /** Bumped when a ride is sent, to fetch the new standings. */
  version: number;
  account: Account;
  /** Today's ride is finished in this browser. */
  riddenHere: boolean;
  onSignIn: () => void;
}) {
  const [board, setBoard] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);
  const signedIn = account.status === "in";

  useEffect(() => {
    if (!date) return;
    let current = true;
    fetch(`/api/daily/rankings?date=${date}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: Board) => {
        if (!current) return;
        setBoard(data);
        setFailed(false);
      })
      .catch(() => {
        if (current) setFailed(true);
      });
    return () => {
      current = false;
    };
  }, [date, version, signedIn]);

  const me = board?.me;
  const inTop = board?.top.some((row) => row.you);

  return (
    <section className="panel" aria-labelledby="rankings-heading">
      <h2 id="rankings-heading">Today&apos;s rankings</h2>
      {failed && !board && <p className="note">The rankings are out of reach right now.</p>}
      {board && board.top.length === 0 && (
        <p className="note">Nobody has ridden Wave #{waveNumber(board.date)} in yet. First in sets the time to beat.</p>
      )}
      {board && board.top.length > 0 && (
        <ol className="ranks">
          {board.top.map((row) => (
            <li key={`${row.rank}-${row.handle}`} className={`ranked${row.you ? " you" : ""}`}>
              <span className="pos">{row.rank}</span>
              <span className="nm">{row.handle}</span>
              <span className="tm">{formatTime(row.ms)}s</span>
            </li>
          ))}
          {me?.rank && !inTop && me.ms !== null && (
            <li className="ranked you">
              <span className="pos">{me.rank}</span>
              <span className="nm">You</span>
              <span className="tm">{formatTime(me.ms)}s</span>
            </li>
          )}
        </ol>
      )}
      {board && board.riders > 0 && (
        <p className="note">
          {board.riders} {board.riders === 1 ? "rider" : "riders"} today. Times are checked by the server.
        </p>
      )}
      {me?.finished && !me.won && <p className="note">You wiped out at {me.percent}% today, so no ranked time.</p>}
      {signedIn && !me && riddenHere && (
        <p className="note">You rode today&apos;s wave before signing in, so it isn&apos;t ranked. Tomorrow&apos;s will be.</p>
      )}
      {account.status === "out" && (
        <button className="btn" type="button" onClick={onSignIn}>
          Sign in to get ranked
        </button>
      )}
    </section>
  );
}
