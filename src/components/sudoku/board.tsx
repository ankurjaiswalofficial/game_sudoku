"use client";

import { cn } from "@/lib/utils";
import type { Board, NotesBoard } from "@/lib/sudoku";

type Props = {
  board: Board;
  given: boolean[][];
  notes: NotesBoard;
  conflicts: boolean[][];
  selected: { row: number; col: number } | null;
  scoreMarker:
    | {
        row: number;
        col: number;
        label: string;
        tone: "positive" | "negative";
        id: number;
      }
    | null;
  onSelect: (row: number, col: number) => void;
};

export function SudokuBoard({
  board,
  given,
  notes,
  conflicts,
  selected,
  scoreMarker,
  onSelect,
}: Props) {
  const selectedValue =
    selected && board[selected.row][selected.col] !== 0
      ? board[selected.row][selected.col]
      : 0;

  return (
    <div
      className="@container grid h-full w-full grid-cols-9 grid-rows-9 overflow-hidden rounded-[calc(var(--radius)*1.35)] bg-border ring-1 ring-border shadow-[var(--board-shadow)]"
      role="grid"
      aria-label="Sudoku board"
    >
      {board.map((row, r) =>
        row.map((value, c) => {
          const isSelected =
            selected && selected.row === r && selected.col === c;
          const inSameRow = selected && selected.row === r;
          const inSameCol = selected && selected.col === c;
          const inSameBox =
            selected &&
            Math.floor(selected.row / 3) === Math.floor(r / 3) &&
            Math.floor(selected.col / 3) === Math.floor(c / 3);
          const isPeer =
            !isSelected && (inSameRow || inSameCol || inSameBox);
          const sameNumber =
            !isSelected && selectedValue !== 0 && value === selectedValue;
          const isGiven = given[r][c];
          const hasConflict = conflicts[r][c];
          const cellNotes = notes[r][c];

          const borderRight =
            c === 2 || c === 5
              ? "border-r-2 border-r-foreground/70"
              : c < 8
                ? "border-r border-r-border"
                : "";
          const borderBottom =
            r === 2 || r === 5
              ? "border-b-2 border-b-foreground/70"
              : r < 8
                ? "border-b border-b-border"
                : "";

          return (
            <button
              key={`${r}-${c}`}
              type="button"
              onClick={() => onSelect(r, c)}
              role="gridcell"
              aria-label={`Row ${r + 1}, Column ${c + 1}${value ? `, value ${value}` : ", empty"}`}
              aria-selected={!!isSelected}
              className={cn(
                "relative flex items-center justify-center bg-background outline-none transition-[background-color,color,transform,box-shadow] duration-150",
                "font-medium tabular-nums select-none cursor-pointer",
                "min-h-0 min-w-0 text-[clamp(1.05rem,5cqw,2.85rem)] leading-none sm:text-[clamp(1.15rem,5cqw,3rem)]",
                borderRight,
                borderBottom,
                isPeer && "bg-accent/50",
                sameNumber && "bg-primary/18",
                isSelected &&
                  "z-10 bg-primary/24 ring-2 ring-primary ring-inset shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_65%,white)]",
                !isGiven && !hasConflict && value !== 0 && "text-primary",
                isGiven && "text-foreground",
                hasConflict && "bg-destructive/12 text-destructive",
                "active:scale-[0.985]",
              )}
            >
              {value !== 0 ? (
                <span>{value}</span>
              ) : cellNotes.size > 0 ? (
                <div className="grid h-full w-full grid-cols-3 grid-rows-3 p-[7%] text-[clamp(0.45rem,1.65cqw,0.92rem)] leading-none text-muted-foreground sm:text-[clamp(0.5rem,1.65cqw,0.95rem)]">
                  {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                    <div
                      key={n}
                      className="flex items-center justify-center"
                    >
                      {cellNotes.has(n) ? n : ""}
                    </div>
                  ))}
                </div>
              ) : null}
              {scoreMarker &&
              scoreMarker.row === r &&
              scoreMarker.col === c ? (
                <span
                  key={scoreMarker.id}
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-[18%] z-20 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[0.52rem] font-bold shadow-sm animate-in fade-in-0 zoom-in-95 duration-300 sm:text-[0.64rem]",
                    scoreMarker.tone === "positive"
                      ? "bg-primary text-primary-foreground"
                      : "bg-destructive text-white",
                  )}
                >
                  {scoreMarker.label}
                </span>
              ) : null}
            </button>
          );
        }),
      )}
    </div>
  );
}
