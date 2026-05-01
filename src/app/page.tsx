import { SudokuGame } from "@/components/sudoku/game";

export default function Home() {
  return (
    <main className="h-svh w-svw overflow-hidden bg-background">
      <SudokuGame />
    </main>
  );
}
