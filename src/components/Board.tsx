"use client";

import { memo, MouseEvent, KeyboardEvent, PointerEvent, useEffect, useRef } from "react";
import { Cell, Game } from "@/game/engine";
import { Fin, Surfboard } from "./Icons";

const LONG_PRESS_MS = 380;
const POP_MS_PER_CELL = 35;
const POP_MAX_MS = 700;

interface TileProps {
  index: number;
  cell: Cell;
  label: string;
  isBoom: boolean;
  isWrongFlag: boolean;
  popDelay: number | null;
}

/** Memoized: the engine keeps unchanged cells identical, so a move only repaints what it touched. */
const Tile = memo(function Tile({ index, cell, label, isBoom, isWrongFlag, popDelay }: TileProps) {
  const classes = ["cell"];
  if (cell.open) classes.push("open");
  if (cell.open && cell.mine) classes.push("mine");
  if (cell.open && !cell.mine && cell.n > 0) classes.push(`n${cell.n}`);
  if (isBoom) classes.push("boom");
  if (isWrongFlag) classes.push("wrong");
  if (popDelay !== null) classes.push("pop");

  return (
    <button
      type="button"
      className={classes.join(" ")}
      data-i={index}
      tabIndex={index === 0 ? 0 : -1}
      aria-label={label}
      style={popDelay !== null ? { animationDelay: `${popDelay}ms` } : undefined}
    >
      {cell.open && cell.mine && <Fin />}
      {cell.open && !cell.mine && cell.n > 0 && cell.n}
      {!cell.open && cell.flag && <Surfboard />}
    </button>
  );
});

function describe(cell: Cell): string {
  if (cell.open && cell.mine) return "shark";
  if (cell.open) return cell.n > 0 ? `${cell.n} nearby` : "clear";
  return cell.flag ? "board placed" : "unread water";
}

interface BoardProps {
  game: Game;
  cellSize: number;
  onOpen: (i: number) => void;
  onFlag: (i: number) => void;
  onPressChange: (pressing: boolean) => void;
}

export default function Board({ game, cellSize, onOpen, onFlag, onPressChange }: BoardProps) {
  const { rows, cols, cells, status, boom } = game;
  const gridRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextClick = useRef(false);
  const lastPointer = useRef("mouse");
  const focusIndex = useRef(0);

  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };

  useEffect(() => {
    const end = () => {
      cancelPress();
      onPressChange(false);
    };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, [onPressChange]);

  const indexFrom = (target: EventTarget): number | null => {
    const el = (target as HTMLElement).closest<HTMLElement>(".cell");
    return el ? Number(el.dataset.i) : null;
  };

  const moveFocus = (next: number) => {
    const tiles = gridRef.current?.children;
    if (!tiles) return;
    (tiles[focusIndex.current] as HTMLElement).tabIndex = -1;
    focusIndex.current = next;
    const tile = tiles[next] as HTMLElement;
    tile.tabIndex = 0;
    tile.focus();
  };

  const handlePointerDown = (e: PointerEvent) => {
    lastPointer.current = e.pointerType;
    // Some browsers send no click after a long-press, so the skip can't outlive this press.
    skipNextClick.current = false;
    const i = indexFrom(e.target);
    if (i === null || e.button !== 0) return;
    if (!cells[i].open && !cells[i].flag) onPressChange(true);
    if (e.pointerType === "touch") {
      cancelPress();
      pressTimer.current = setTimeout(() => {
        pressTimer.current = null;
        skipNextClick.current = true;
        onPressChange(false);
        onFlag(i);
      }, LONG_PRESS_MS);
    }
  };

  const handleClick = (e: MouseEvent) => {
    const i = indexFrom(e.target);
    if (i === null) return;
    if (skipNextClick.current) {
      skipNextClick.current = false;
      return;
    }
    onOpen(i);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    // A touch long-press has already been handled by the timer above.
    if (lastPointer.current === "touch") return;
    const i = indexFrom(e.target);
    if (i !== null) onFlag(i);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const i = indexFrom(e.target);
    if (i === null) return;
    if (e.key === "f" || e.key === "F") {
      e.preventDefault();
      onFlag(i);
      return;
    }
    let r = Math.floor(i / cols);
    let c = i % cols;
    if (e.key === "ArrowUp") r--;
    else if (e.key === "ArrowDown") r++;
    else if (e.key === "ArrowLeft") c--;
    else if (e.key === "ArrowRight") c++;
    else return;
    e.preventDefault();
    moveFocus(((r + rows) % rows) * cols + ((c + cols) % cols));
  };

  const boomRow = boom === null ? 0 : Math.floor(boom / cols);
  const boomCol = boom === null ? 0 : boom % cols;

  return (
    <div className={`board-wrap${status === "lost" ? " shake" : ""}`}>
      <div
        ref={gridRef}
        className="grid"
        role="group"
        aria-label={`Ocean, ${rows} rows by ${cols} columns`}
        style={{ gridTemplateColumns: `repeat(${cols}, var(--cell))`, ["--cell" as string]: `${cellSize}px` }}
        onPointerDown={handlePointerDown}
        onPointerCancel={() => {
          cancelPress();
          onPressChange(false);
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
      >
        {cells.map((cell, i) => {
          const r = Math.floor(i / cols);
          const c = i % cols;
          const shown = status === "lost" && cell.open && cell.mine;
          return (
            <Tile
              key={i}
              index={i}
              cell={cell}
              label={`Row ${r + 1}, column ${c + 1}, ${describe(cell)}`}
              isBoom={boom === i}
              isWrongFlag={status === "lost" && cell.flag && !cell.mine}
              popDelay={
                shown
                  ? Math.min(POP_MAX_MS, Math.round(Math.hypot(r - boomRow, c - boomCol) * POP_MS_PER_CELL))
                  : null
              }
            />
          );
        })}
      </div>
      {status === "won" && <div className="sweep" />}
    </div>
  );
}
