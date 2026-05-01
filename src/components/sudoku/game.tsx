"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eraser,
  Lightbulb,
  Pause,
  PencilLine,
  Play,
  RotateCcw,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import { SudokuBoard } from "./board";
import { NumberPad } from "./number-pad";
import {
  cloneBoard,
  cloneNotes,
  countNumberOccurrences,
  emptyNotes,
  generatePuzzle,
  getConflicts,
  isBoardComplete,
  type Board,
  type Difficulty,
  type NotesBoard,
} from "@/lib/sudoku";

const MAX_MISTAKES = 3;
const MAX_HINTS = 3;

type GameState = {
  puzzle: Board;
  solution: Board;
  board: Board;
  notes: NotesBoard;
  given: boolean[][];
};

type HistoryEntry = {
  board: Board;
  notes: NotesBoard;
};

function buildGiven(puzzle: Board): boolean[][] {
  return puzzle.map((row) => row.map((v) => v !== 0));
}

function newGame(difficulty: Difficulty): GameState {
  const { puzzle, solution } = generatePuzzle(difficulty);
  return {
    puzzle,
    solution,
    board: cloneBoard(puzzle),
    notes: emptyNotes(),
    given: buildGiven(puzzle),
  };
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [notesMode, setNotesMode] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [generating, setGenerating] = useState(true);

  const startGame = useCallback((d: Difficulty) => {
    setGenerating(true);
    setDifficulty(d);
    setSelected(null);
    setNotesMode(false);
    setHistory([]);
    setMistakes(0);
    setHintsUsed(0);
    setSeconds(0);
    setPaused(false);
    setWon(false);
    setLost(false);
    setTimeout(() => {
      setState(newGame(d));
      setGenerating(false);
    }, 30);
  }, []);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    startGame("easy");
  }, [startGame]);

  useEffect(() => {
    if (!state || paused || won || lost) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [state, paused, won, lost]);

  const conflicts = useMemo(
    () => (state ? getConflicts(state.board) : null),
    [state],
  );
  const counts = useMemo(
    () => (state ? countNumberOccurrences(state.board) : {}),
    [state],
  );

  const pushHistory = useCallback(() => {
    if (!state) return;
    setHistory((h) => [
      ...h,
      { board: cloneBoard(state.board), notes: cloneNotes(state.notes) },
    ]);
  }, [state]);

  const handleSelect = useCallback((r: number, c: number) => {
    setSelected({ row: r, col: c });
  }, []);

  const placeNumber = useCallback(
    (n: number) => {
      if (!state || !selected || won || lost || paused) return;
      const { row, col } = selected;
      if (state.given[row][col]) return;

      if (notesMode) {
        if (state.board[row][col] !== 0) return;
        pushHistory();
        const nextNotes = cloneNotes(state.notes);
        const cellNotes = nextNotes[row][col];
        if (cellNotes.has(n)) cellNotes.delete(n);
        else cellNotes.add(n);
        setState({ ...state, notes: nextNotes });
        return;
      }

      if (state.board[row][col] === n) {
        pushHistory();
        const nextBoard = cloneBoard(state.board);
        nextBoard[row][col] = 0;
        setState({ ...state, board: nextBoard });
        return;
      }

      pushHistory();
      const nextBoard = cloneBoard(state.board);
      const nextNotes = cloneNotes(state.notes);
      nextBoard[row][col] = n;
      nextNotes[row][col].clear();

      for (let i = 0; i < 9; i++) {
        nextNotes[row][i].delete(n);
        nextNotes[i][col].delete(n);
      }
      const br = Math.floor(row / 3) * 3;
      const bc = Math.floor(col / 3) * 3;
      for (let r = br; r < br + 3; r++) {
        for (let c = bc; c < bc + 3; c++) {
          nextNotes[r][c].delete(n);
        }
      }

      const correct = state.solution[row][col] === n;
      if (!correct) {
        const nextMistakes = mistakes + 1;
        setMistakes(nextMistakes);
        toast.error(`Mistake (${nextMistakes}/${MAX_MISTAKES})`);
        if (nextMistakes >= MAX_MISTAKES) setLost(true);
      }

      setState({ ...state, board: nextBoard, notes: nextNotes });

      if (correct && isBoardComplete(nextBoard)) setWon(true);
    },
    [state, selected, notesMode, won, lost, paused, mistakes, pushHistory],
  );

  const erase = useCallback(() => {
    if (!state || !selected || won || lost || paused) return;
    const { row, col } = selected;
    if (state.given[row][col]) return;
    if (state.board[row][col] === 0 && state.notes[row][col].size === 0) return;
    pushHistory();
    const nextBoard = cloneBoard(state.board);
    const nextNotes = cloneNotes(state.notes);
    nextBoard[row][col] = 0;
    nextNotes[row][col].clear();
    setState({ ...state, board: nextBoard, notes: nextNotes });
  }, [state, selected, won, lost, paused, pushHistory]);

  const undo = useCallback(() => {
    if (history.length === 0 || !state) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setState({ ...state, board: prev.board, notes: prev.notes });
  }, [history, state]);

  const giveHint = useCallback(() => {
    if (!state || !selected || won || lost || paused) return;
    if (hintsUsed >= MAX_HINTS) {
      toast.error("No hints remaining");
      return;
    }
    const { row, col } = selected;
    if (state.given[row][col]) return;
    if (state.board[row][col] === state.solution[row][col]) return;
    pushHistory();
    const nextBoard = cloneBoard(state.board);
    const nextNotes = cloneNotes(state.notes);
    nextBoard[row][col] = state.solution[row][col];
    nextNotes[row][col].clear();
    setHintsUsed((h) => h + 1);
    setState({ ...state, board: nextBoard, notes: nextNotes });
    toast.success(`Revealed ${state.solution[row][col]}`);
    if (isBoardComplete(nextBoard)) setWon(true);
  }, [state, selected, won, lost, paused, hintsUsed, pushHistory]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paused || won || lost) return;
      const s = stateRef.current;
      if (!s) return;
      if (e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        placeNumber(parseInt(e.key, 10));
        return;
      }
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        e.preventDefault();
        erase();
        return;
      }
      if (e.key.toLowerCase() === "n") {
        setNotesMode((m) => !m);
        return;
      }
      if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        setSelected((cur) => {
          const c = cur ?? { row: 0, col: 0 };
          if (e.key === "ArrowUp")
            return { row: Math.max(0, c.row - 1), col: c.col };
          if (e.key === "ArrowDown")
            return { row: Math.min(8, c.row + 1), col: c.col };
          if (e.key === "ArrowLeft")
            return { row: c.row, col: Math.max(0, c.col - 1) };
          return { row: c.row, col: Math.min(8, c.col + 1) };
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [placeNumber, erase, undo, paused, won, lost]);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4 lg:gap-8 lg:px-6 lg:py-6 xl:px-8">
      <Toaster position="top-center" richColors />
      <header className="rounded-[calc(var(--radius)*1.5)] border border-border/80 bg-card/85 p-4 shadow-[var(--shell-shadow)] backdrop-blur-xl sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Session remix
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] text-balance sm:text-4xl lg:text-5xl">
              Sudoku that looks different every session and stays readable on every screen.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Clean contrast, larger tap targets, and a layout that keeps the board centered while the controls stay easy to reach on phones.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-2xl border border-border/80 bg-background/70 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Time
              </div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl">
                {formatTime(seconds)}
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/70 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Mistakes
              </div>
              <div
                className={
                  "mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl " +
                  (mistakes >= MAX_MISTAKES ? "text-destructive" : "")
                }
              >
                {mistakes}/{MAX_MISTAKES}
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-background/70 px-3 py-3 shadow-sm backdrop-blur-sm sm:px-4">
              <div className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Hints
              </div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl">
                {MAX_HINTS - hintsUsed}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[calc(var(--radius)*1.6)] border border-border/80 bg-card/85 p-3 shadow-[var(--shell-shadow)] backdrop-blur-xl sm:p-4 lg:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
                Current board
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Tap a cell, use the keypad, or type 1 to 9. Notes toggle stays available on mobile and keyboard.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-border/70 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full bg-primary" />
              {notesMode ? "Notes mode enabled" : "Direct entry enabled"}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[min(92vw,760px)]">
            <div className="relative aspect-square w-full">
              {state && conflicts ? (
                <SudokuBoard
                  board={state.board}
                  given={state.given}
                  notes={state.notes}
                  conflicts={conflicts}
                  selected={selected}
                  onSelect={handleSelect}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-[calc(var(--radius)*1.35)] border border-border/80 bg-background/75 text-base text-muted-foreground shadow-[var(--board-shadow)]">
                  {generating ? "Generating puzzle..." : "Loading..."}
                </div>
              )}
              {paused && state && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[calc(var(--radius)*1.35)] bg-background/72 px-6 text-center backdrop-blur-md">
                  <p className="font-heading text-3xl font-semibold tracking-[-0.04em]">
                    Paused
                  </p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Resume when you are ready. Your current board stays intact.
                  </p>
                  <Button size="lg" onClick={() => setPaused(false)}>
                    <Play className="size-4" />
                    Resume game
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
          <div className="rounded-[calc(var(--radius)*1.6)] border border-border/80 bg-card/88 p-4 shadow-[var(--shell-shadow)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select
                  value={difficulty}
                  onValueChange={(v) => startGame(v as Difficulty)}
                >
                  <SelectTrigger className="h-11 flex-1 rounded-xl bg-background/75 px-4 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2 sm:w-[108px]">
                  <Button
                    variant="outline"
                    size="icon-lg"
                    aria-label="New game"
                    onClick={() => startGame(difficulty)}
                    className="rounded-xl bg-background/75"
                  >
                    <RotateCcw className="size-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-lg"
                    aria-label={paused ? "Resume" : "Pause"}
                    onClick={() => setPaused((p) => !p)}
                    className="rounded-xl bg-background/75"
                  >
                    {paused ? <Play className="size-5" /> : <Pause className="size-5" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={undo}
                  disabled={history.length === 0}
                  className="h-14 rounded-2xl justify-start gap-3 bg-background/75 px-4 text-left text-sm"
                >
                  <Undo2 className="size-5 shrink-0" />
                  <span>Undo move</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={erase}
                  className="h-14 rounded-2xl justify-start gap-3 bg-background/75 px-4 text-left text-sm"
                >
                  <Eraser className="size-5 shrink-0" />
                  <span>Clear cell</span>
                </Button>
                <Button
                  variant={notesMode ? "default" : "outline"}
                  onClick={() => setNotesMode((m) => !m)}
                  className="h-14 rounded-2xl justify-start gap-3 px-4 text-left text-sm"
                >
                  <PencilLine className="size-5 shrink-0" />
                  <span>Notes mode</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={giveHint}
                  disabled={hintsUsed >= MAX_HINTS}
                  className="h-14 rounded-2xl justify-start gap-3 bg-background/75 px-4 text-left text-sm"
                >
                  <Lightbulb className="size-5 shrink-0" />
                  <span>Use hint</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[calc(var(--radius)*1.6)] border border-border/80 bg-card/88 p-4 shadow-[var(--shell-shadow)] backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-heading text-lg font-semibold tracking-[-0.03em]">
                  Number pad
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Remaining counts stay visible even on the smallest screens.
                </p>
              </div>
            </div>
            {state && (
              <NumberPad
                counts={counts}
                onNumber={placeNumber}
                notesMode={notesMode}
              />
            )}
          </div>

          <div className="rounded-[calc(var(--radius)*1.5)] border border-border/80 bg-card/82 p-4 shadow-[var(--shell-shadow)] backdrop-blur-xl">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Shortcuts
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              1 to 9 place values, arrow keys move, N toggles notes, Backspace clears, and Ctrl+Z undoes.
            </p>
          </div>
        </aside>
      </div>

      <Dialog open={won} onOpenChange={(o) => !o && setWon(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You solved it!</DialogTitle>
            <DialogDescription>
              {`Difficulty: ${difficulty} · Time: ${formatTime(seconds)} · Mistakes: ${mistakes}`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWon(false)}>
              Close
            </Button>
            <Button onClick={() => startGame(difficulty)}>New game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lost} onOpenChange={(o) => !o && setLost(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Out of mistakes</DialogTitle>
            <DialogDescription>
              You reached the limit of {MAX_MISTAKES} mistakes. Try again?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLost(false)}>
              Review board
            </Button>
            <Button onClick={() => startGame(difficulty)}>New game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
