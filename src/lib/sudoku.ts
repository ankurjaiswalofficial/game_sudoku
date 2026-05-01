export type Board = number[][];
export type NotesBoard = Set<number>[][];
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export const DIFFICULTY_HOLES: Record<Difficulty, number> = {
  easy: 36,
  medium: 46,
  hard: 52,
  expert: 58,
};

const range9 = [0, 1, 2, 3, 4, 5, 6, 7, 8] as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function emptyBoard(): Board {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function isValidPlacement(
  board: Board,
  row: number,
  col: number,
  num: number,
): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === num && i !== col) return false;
    if (board[i][col] === num && i !== row) return false;
  }
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) {
    for (let c = bc; c < bc + 3; c++) {
      if (board[r][c] === num && (r !== row || c !== col)) return false;
    }
  }
  return true;
}

function fillBoard(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
          if (isValidPlacement(board, r, c, n)) {
            board[r][c] = n;
            if (fillBoard(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

function countSolutions(board: Board, limit = 2): number {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        let count = 0;
        for (let n = 1; n <= 9; n++) {
          if (isValidPlacement(board, r, c, n)) {
            board[r][c] = n;
            count += countSolutions(board, limit - count);
            board[r][c] = 0;
            if (count >= limit) return count;
          }
        }
        return count;
      }
    }
  }
  return 1;
}

export function solveBoard(board: Board): Board | null {
  const work = cloneBoard(board);
  if (fillSolved(work)) return work;
  return null;
}

function fillSolved(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) {
        for (let n = 1; n <= 9; n++) {
          if (isValidPlacement(board, r, c, n)) {
            board[r][c] = n;
            if (fillSolved(board)) return true;
            board[r][c] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
}

export function generatePuzzle(difficulty: Difficulty): {
  puzzle: Board;
  solution: Board;
} {
  const solution = emptyBoard();
  fillBoard(solution);

  const puzzle = cloneBoard(solution);
  const holes = DIFFICULTY_HOLES[difficulty];

  const cells = shuffle(
    range9.flatMap((r) => range9.map((c) => [r, c] as [number, number])),
  );

  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= holes) break;
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    const test = cloneBoard(puzzle);
    if (countSolutions(test, 2) !== 1) {
      puzzle[r][c] = backup;
    } else {
      removed++;
    }
  }

  return { puzzle, solution };
}

export function isBoardComplete(board: Board): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] === 0) return false;
      if (!isValidPlacement(board, r, c, board[r][c])) return false;
    }
  }
  return true;
}

export function getConflicts(board: Board): boolean[][] {
  const conflicts: boolean[][] = Array.from({ length: 9 }, () =>
    Array(9).fill(false),
  );
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v !== 0 && !isValidPlacement(board, r, c, v)) {
        conflicts[r][c] = true;
      }
    }
  }
  return conflicts;
}

export function countNumberOccurrences(board: Board): Record<number, number> {
  const counts: Record<number, number> = {};
  for (let n = 1; n <= 9; n++) counts[n] = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) counts[board[r][c]]++;
    }
  }
  return counts;
}

export function emptyNotes(): NotesBoard {
  return Array.from({ length: 9 }, () =>
    Array.from({ length: 9 }, () => new Set<number>()),
  );
}

export function cloneNotes(notes: NotesBoard): NotesBoard {
  return notes.map((row) => row.map((s) => new Set(s)));
}
