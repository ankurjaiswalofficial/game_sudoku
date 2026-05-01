import { SudokuGame } from "@/components/sudoku/game";

export default function Home() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <SudokuGame />
    </main>
  );
}
