"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { SunFace } from "./Icons";

interface VictoryProps {
  wave: string;
  time: string;
  newBest: boolean;
  daily: boolean;
  copied: boolean;
  onClose: () => void;
  onAgain: () => void;
  onShare: () => void;
}

/** Only mounted for a newly earned win, never for a restored Daily Wave. */
export default function Victory({ wave, time, newBest, daily, copied, onClose, onAgain, onShare }: VictoryProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} className="victory" aria-labelledby="victory-title" aria-describedby="victory-description" onClose={() => { if (!dialog.current?.open) onClose(); }}>
      <div className="victory-confetti" aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => (
          <i key={i} style={{
            left: `${(i * 37) % 100}%`,
            "--delay": `${(i % 8) * 65}ms`,
            "--drift": `${((i * 43) % 180) - 90}px`,
            "--turn": `${i % 2 ? 540 : -540}deg`,
            background: ["#F4A63A", "#E4533A", "#3BA4A6", "#FFF6E2"][i % 4],
          } as CSSProperties} />
        ))}
      </div>
      <button className="victory-close" type="button" aria-label="Close celebration and view board" onClick={onClose}>×</button>
      <div className="victory-sun" data-face="win" aria-hidden="true"><SunFace /></div>
      <p className="victory-eyebrow">{daily ? "Daily Wave conquered" : "All clear. All yours."}</p>
      <h2 id="victory-title">You rode it in!</h2>
      <p id="victory-description">Every shark dodged. Every square conquered.<br />Now that&apos;s a beautiful ride.</p>
      <div className="victory-score"><strong>{time}<span>s</span></strong><span>{wave}</span></div>
      {newBest && <p className="victory-badge">★ New personal best ★</p>}
      <div className="victory-actions">
        <button autoFocus className="btn big" type="button" onClick={daily ? onShare : onAgain}>
          {daily ? (copied ? "Copied! Spread the stoke." : "Share the stoke") : "Catch another wave"}
        </button>
        <button className="victory-board" type="button" onClick={onClose}>Admire your board →</button>
      </div>
    </dialog>
  );
}
