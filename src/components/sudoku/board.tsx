"use client";

import { cn } from "@/lib/utils";
import type { Board, NotesBoard } from "@/lib/sudoku";

type Props = {
  board: Board;
  given: boolean[][];
  notes: NotesBoard;
  conflicts: boolean[][];
  selected: { row: number; col: number } | null;
  onSelect: (row: number, col: number) => void;
};

export function SudokuBoard({
  board,
  given,
  notes,
  conflicts,
  selected,
  onSelect,
}: Props) {
  const selectedValue =
    selected && board[selected.row][selected.col] !== 0
      ? board[selected.row][selected.col]
      : 0;

  return (
    <div
      className="@container w-full h-full grid grid-cols-9 grid-rows-9 bg-border rounded-xl overflow-hidden ring-1 ring-border shadow-sm"
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
                "relative flex items-center justify-center bg-background outline-none transition-colors",
                "font-medium tabular-nums select-none cursor-pointer",
                "text-[clamp(1rem,5cqw,2.5rem)] leading-none",
                borderRight,
                borderBottom,
                isPeer && "bg-accent/40",
                sameNumber && "bg-primary/15",
                isSelected && "bg-primary/25 ring-2 ring-primary ring-inset z-10",
                !isGiven && !hasConflict && value !== 0 && "text-primary",
                isGiven && "text-foreground",
                hasConflict && "text-destructive bg-destructive/10",
              )}
            >
              {value !== 0 ? (
                <span>{value}</span>
              ) : cellNotes.size > 0 ? (
                <div className="grid grid-cols-3 grid-rows-3 w-full h-full p-[8%] text-[clamp(0.45rem,1.6cqw,0.8rem)] leading-none text-muted-foreground">
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
            </button>
          );
        }),
      )}
    </div>
  );
}
