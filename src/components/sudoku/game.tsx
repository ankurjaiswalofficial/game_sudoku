"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Eraser,
  Info,
  Lightbulb,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";

import { clearVisualSession, startNewVisualSession } from "@/components/session-theme";
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
import { toast } from "sonner";

import { SudokuBoard } from "./board";
import { NumberPad } from "./number-pad";

const MAX_MISTAKES = 3;
const MAX_HINTS = 3;
const BASE_POINTS: Record<Difficulty, number> = {
  easy: 150,
  medium: 180,
  hard: 250,
  expert: 250,
};
const ROW_BONUS = 50;
const COLUMN_BONUS = 50;
const BOX_BONUS = 100;
const COMPLETION_BONUS = 500;
const HINT_PENALTY = 75;
const WRONG_MOVE_PENALTY = 30;

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
  score: number;
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

function isSolvedRow(board: Board, solution: Board, row: number) {
  return board[row].every((value, col) => value !== 0 && value === solution[row][col]);
}

function isSolvedColumn(board: Board, solution: Board, col: number) {
  return board.every((row, rowIndex) => row[col] !== 0 && row[col] === solution[rowIndex][col]);
}

function isSolvedBox(board: Board, solution: Board, row: number, col: number) {
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === 0 || board[r][c] !== solution[r][c]) {
        return false;
      }
    }
  }
  return true;
}

function buildScoreBreakdown(
  previousBoard: Board,
  nextBoard: Board,
  solution: Board,
  row: number,
  col: number,
  difficulty: Difficulty,
) {
  let points = BASE_POINTS[difficulty];
  const reasons = [`+${BASE_POINTS[difficulty]} correct move`];

  const rowWasSolved = isSolvedRow(previousBoard, solution, row);
  const rowNowSolved = isSolvedRow(nextBoard, solution, row);
  if (!rowWasSolved && rowNowSolved) {
    points += ROW_BONUS;
    reasons.push(`+${ROW_BONUS} row complete`);
  }

  const colWasSolved = isSolvedColumn(previousBoard, solution, col);
  const colNowSolved = isSolvedColumn(nextBoard, solution, col);
  if (!colWasSolved && colNowSolved) {
    points += COLUMN_BONUS;
    reasons.push(`+${COLUMN_BONUS} column complete`);
  }

  const boxWasSolved = isSolvedBox(previousBoard, solution, row, col);
  const boxNowSolved = isSolvedBox(nextBoard, solution, row, col);
  if (!boxWasSolved && boxNowSolved) {
    points += BOX_BONUS;
    reasons.push(`+${BOX_BONUS} box complete`);
  }

  if (isBoardComplete(nextBoard)) {
    points += COMPLETION_BONUS;
    reasons.push(`+${COMPLETION_BONUS} puzzle complete`);
  }

  return { points, reasons };
}

export function SudokuGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [state, setState] = useState<GameState | null>(null);
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(
    null,
  );
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [paused, setPaused] = useState(false);
  const [won, setWon] = useState(false);
  const [lost, setLost] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [score, setScore] = useState(0);
  const [lastScoreEvent, setLastScoreEvent] = useState<string | null>(null);
  const [scoreMarker, setScoreMarker] = useState<{
    row: number;
    col: number;
    label: string;
    tone: "positive" | "negative";
    id: number;
  } | null>(null);

  const startGame = useCallback((d: Difficulty) => {
    setGenerating(true);
    setDifficulty(d);
    setSelected(null);
    setHistory([]);
    setMistakes(0);
    setHintsUsed(0);
    setSeconds(0);
    setScore(0);
    setLastScoreEvent(null);
    setScoreMarker(null);
    setPaused(false);
    setWon(false);
    setLost(false);
    setTimeout(() => {
      setState(newGame(d));
      setGenerating(false);
    }, 30);
  }, []);

  const clearBoard = useCallback(() => {
    if (!state) return;
    setHistory([]);
    setSelected(null);
    setMistakes(0);
    setHintsUsed(0);
    setSeconds(0);
    setScore(0);
    setLastScoreEvent(null);
    setScoreMarker(null);
    setPaused(false);
    setWon(false);
    setLost(false);
    setState({
      ...state,
      board: cloneBoard(state.puzzle),
      notes: emptyNotes(),
    });
    toast.success("Board cleared");
  }, [state]);

  const startNewSession = useCallback(() => {
    startNewVisualSession();
    startGame(difficulty);
    toast.success("Started a new session");
  }, [difficulty, startGame]);

  const deleteSession = useCallback(() => {
    clearVisualSession();
    setConfirmDeleteSession(false);
    startGame("easy");
    toast.success("Session deleted");
  }, [startGame]);

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

  useEffect(() => {
    if (!scoreMarker) return;
    const id = window.setTimeout(() => setScoreMarker(null), 1100);
    return () => window.clearTimeout(id);
  }, [scoreMarker]);

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
      {
        board: cloneBoard(state.board),
        notes: cloneNotes(state.notes),
        score,
      },
    ]);
  }, [score, state]);

  const handleSelect = useCallback((row: number, col: number) => {
    setSelected({ row, col });
  }, []);

  const placeNumber = useCallback(
    (n: number) => {
      if (!state || !selected || won || lost || paused) return;
      const { row, col } = selected;
      if (state.given[row][col]) return;

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
        setScore((current) => Math.max(0, current - WRONG_MOVE_PENALTY));
        setLastScoreEvent(`-${WRONG_MOVE_PENALTY} wrong move`);
        setScoreMarker({
          row,
          col,
          label: `-${WRONG_MOVE_PENALTY}`,
          tone: "negative",
          id: Date.now(),
        });
        toast.error(`Mistake (${nextMistakes}/${MAX_MISTAKES})`);
        if (nextMistakes >= MAX_MISTAKES) setLost(true);
      }

      setState({ ...state, board: nextBoard, notes: nextNotes });
      if (correct) {
        const scoreBreakdown = buildScoreBreakdown(
          state.board,
          nextBoard,
          state.solution,
          row,
          col,
          difficulty,
        );
        setScore((current) => current + scoreBreakdown.points);
        setLastScoreEvent(scoreBreakdown.reasons.join(" · "));
        setScoreMarker({
          row,
          col,
          label: `+${scoreBreakdown.points}`,
          tone: "positive",
          id: Date.now(),
        });
        toast.success(`+${scoreBreakdown.points} points`, {
          description: scoreBreakdown.reasons.join(" · "),
        });
        if (isBoardComplete(nextBoard)) setWon(true);
      }
    },
    [state, selected, won, lost, paused, mistakes, pushHistory, difficulty],
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
    if (!state || history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setScore(prev.score);
    setLastScoreEvent("Move undone");
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
    setScore((current) => Math.max(0, current - HINT_PENALTY));
    setLastScoreEvent(`-${HINT_PENALTY} hint used`);
    setScoreMarker({
      row,
      col,
      label: `-${HINT_PENALTY}`,
      tone: "negative",
      id: Date.now(),
    });
    setState({ ...state, board: nextBoard, notes: nextNotes });
    toast.success(`Revealed ${state.solution[row][col]}`, {
      description: `-${HINT_PENALTY} points for using a hint`,
    });
    if (isBoardComplete(nextBoard)) setWon(true);
  }, [state, selected, won, lost, paused, hintsUsed, pushHistory]);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (paused || won || lost) return;
      const currentState = stateRef.current;
      if (!currentState) return;

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
      if (e.key.toLowerCase() === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        undo();
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelected((cur) => {
          const cell = cur ?? { row: 0, col: 0 };
          if (e.key === "ArrowUp") {
            return { row: Math.max(0, cell.row - 1), col: cell.col };
          }
          if (e.key === "ArrowDown") {
            return { row: Math.min(8, cell.row + 1), col: cell.col };
          }
          if (e.key === "ArrowLeft") {
            return { row: cell.row, col: Math.max(0, cell.col - 1) };
          }
          return { row: cell.row, col: Math.min(8, cell.col + 1) };
        });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [placeNumber, erase, undo, paused, won, lost]);

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-400 flex-col gap-3 px-2 py-2 sm:gap-4 sm:px-4 sm:py-4 lg:gap-8 lg:px-6 lg:py-6 xl:px-8">
      <Toaster position="top-center" richColors />

      <header className="rounded-[calc(var(--radius)*1.2)] border border-border/80 bg-card/88 p-3 shadow-(--shell-shadow) backdrop-blur-xl sm:p-4 lg:p-6">
        <div className="flex items-start flex-wrap justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-heading text-2xl font-semibold tracking-[-0.04em] sm:text-3xl lg:text-[3rem]">
              Sudoku
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm lg:text-base">
              Board first. Controls below. Clear on every screen.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="rounded-xl border border-border/80 bg-background/75 px-2.5 py-1.5 text-center shadow-sm sm:px-3">
              <div className="text-[0.55rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Time
              </div>
              <div className="font-mono text-sm font-semibold tabular-nums sm:text-base">
                {formatTime(seconds)}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label="Open instructions"
              onClick={() => setShowHelp(true)}
              className="rounded-xl bg-background/75"
            >
              <Info className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Start new session"
              onClick={startNewSession}
              className="rounded-xl bg-background/75"
            >
              <RotateCcw className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label={paused ? "Resume game" : "Pause game"}
              onClick={() => setPaused((p) => !p)}
              className="rounded-xl bg-background/75"
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Delete session"
              onClick={() => setConfirmDeleteSession(true)}
              className="rounded-xl bg-background/75"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <Select
            value={difficulty}
            onValueChange={(v) => startGame(v as Difficulty)}
          >
            <SelectTrigger className="h-9 min-w-[128px] rounded-xl bg-background/75 px-3 text-sm sm:h-10 sm:text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-[0.72rem] text-muted-foreground sm:gap-3 sm:text-sm">
            <span className="font-semibold text-foreground">Score {score}</span>
            <span>Hints {MAX_HINTS - hintsUsed}</span>
            <span
              className={mistakes >= MAX_MISTAKES ? "text-destructive" : undefined}
            >
              Mistakes {mistakes}/{MAX_MISTAKES}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-[calc(var(--radius)*1.35)] border border-border/80 bg-card/88 p-2 shadow-[var(--shell-shadow)] backdrop-blur-xl sm:p-4 lg:p-5">
          <div className="mx-auto w-full max-w-[min(96vw,760px)]">
            <div className="relative aspect-square w-full">
              {state && conflicts ? (
                <SudokuBoard
                  board={state.board}
                  given={state.given}
                  notes={state.notes}
                  conflicts={conflicts}
                  selected={selected}
                  scoreMarker={scoreMarker}
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
                  <Button size="lg" onClick={() => setPaused(false)}>
                    <Play className="size-4" />
                    Resume
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 lg:hidden">
            <Button
              variant="outline"
              onClick={undo}
              disabled={history.length === 0}
              className="h-11 rounded-xl px-1.5 text-[0.7rem]"
            >
              <Undo2 className="size-4" />
              Undo
            </Button>
            <Button
              variant="outline"
              onClick={erase}
              className="h-11 rounded-xl px-1.5 text-[0.7rem]"
            >
              <Eraser className="size-4" />
              Clear
            </Button>
            <Button
              variant="outline"
              onClick={giveHint}
              disabled={hintsUsed >= MAX_HINTS}
              className="h-11 rounded-xl px-1.5 text-[0.7rem]"
            >
              <Lightbulb className="size-4" />
              Hint
            </Button>
            <Button
              variant="outline"
              onClick={() => startGame(difficulty)}
              className="h-11 rounded-xl px-1.5 text-[0.7rem]"
            >
              <RotateCcw className="size-4" />
              Restart
            </Button>
          </div>

          {state && (
            <div className="mt-3 lg:hidden">
              <NumberPad counts={counts} onNumber={placeNumber} notesMode={false} />
            </div>
          )}

          <div className="mt-3 rounded-xl border border-border/80 bg-background/75 px-3 py-2 text-xs text-muted-foreground sm:text-sm lg:hidden">
            <div className="font-semibold text-foreground">Score: {score}</div>
            <div className="mt-1">{lastScoreEvent ?? "Make a correct move to earn points."}</div>
          </div>
        </section>

        <aside className="hidden flex-col gap-4 lg:sticky lg:top-6 lg:flex">
          <div className="rounded-[calc(var(--radius)*1.6)] border border-border/80 bg-card/88 p-4 shadow-[var(--shell-shadow)] backdrop-blur-xl sm:p-5">
            <div className="mb-4">
              <h3 className="font-heading text-lg font-semibold tracking-[-0.03em]">
                Session
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Start fresh, clear your entries, or remove the current session.
              </p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                onClick={startNewSession}
                className="h-12 rounded-2xl justify-start gap-3 px-4 text-sm"
              >
                <RotateCcw className="size-5 shrink-0" />
                <span>New session</span>
              </Button>
              <Button
                variant="outline"
                onClick={clearBoard}
                className="h-12 rounded-2xl justify-start gap-3 bg-background/75 px-4 text-sm"
              >
                <Eraser className="size-5 shrink-0" />
                <span>Clear board</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteSession(true)}
                className="h-12 rounded-2xl justify-start gap-3 bg-background/75 px-4 text-sm sm:col-span-2"
              >
                <Trash2 className="size-5 shrink-0" />
                <span>Delete session</span>
              </Button>
            </div>

            <div className="h-px bg-border/80" />

            <div className="my-4">
              <h3 className="font-heading text-lg font-semibold tracking-[-0.03em]">
                Actions
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage the current puzzle from here.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-2xl border border-border/80 bg-background/75 px-4 py-3">
                <div className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Score card
                </div>
                <div className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
                  {score}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {lastScoreEvent ?? "Make a correct move to start scoring."}
                </p>
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
                  variant="outline"
                  onClick={giveHint}
                  disabled={hintsUsed >= MAX_HINTS}
                  className="h-14 rounded-2xl justify-start gap-3 bg-background/75 px-4 text-left text-sm"
                >
                  <Lightbulb className="size-5 shrink-0" />
                  <span>Use hint</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => startGame(difficulty)}
                  className="h-14 rounded-2xl justify-start gap-3 bg-background/75 px-4 text-left text-sm"
                >
                  <RotateCcw className="size-5 shrink-0" />
                  <span>Restart game</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[calc(var(--radius)*1.6)] border border-border/80 bg-card/88 p-4 shadow-[var(--shell-shadow)] backdrop-blur-xl sm:p-5">
            <div className="mb-3">
              <h3 className="font-heading text-lg font-semibold tracking-[-0.03em]">
                Enter numbers
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tap a number below to place it in the selected cell.
              </p>
            </div>
            {state && (
              <NumberPad counts={counts} onNumber={placeNumber} notesMode={false} />
            )}
          </div>
        </aside>
      </div>

      <Dialog open={won} onOpenChange={(o) => !o && setWon(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>You solved it!</DialogTitle>
            <DialogDescription>
              {`Difficulty: ${difficulty} · Time: ${formatTime(seconds)} · Mistakes: ${mistakes} · Score: ${score}`}
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

      <Dialog
        open={confirmDeleteSession}
        onOpenChange={(o) => !o && setConfirmDeleteSession(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete current session?</DialogTitle>
            <DialogDescription>
              This will remove the current session state, reset the theme, and start a new easy game.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteSession(false)}
            >
              Cancel
            </Button>
            <Button onClick={deleteSession}>Delete session</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHelp} onOpenChange={(o) => !o && setShowHelp(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instructions</DialogTitle>
            <DialogDescription>
              Select a cell on the board and then choose a number from the row below. Use Undo to go back, Clear to remove a value, Hint to reveal one value, and Restart to begin the current puzzle again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
