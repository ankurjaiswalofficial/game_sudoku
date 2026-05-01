"use client";

import { cn } from "@/lib/utils";

type Props = {
  counts: Record<number, number>;
  onNumber: (n: number) => void;
  notesMode: boolean;
};

export function NumberPad({ counts, onNumber, notesMode }: Props) {
  return (
    <div className="grid grid-cols-9 gap-1.5 sm:gap-2 w-full">
      {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
        const remaining = 9 - (counts[n] ?? 0);
        const done = remaining <= 0;
        return (
          <button
            key={n}
            type="button"
            disabled={done && !notesMode}
            onClick={() => onNumber(n)}
            className={cn(
              "relative aspect-square w-full rounded-lg border bg-card text-card-foreground",
              "flex items-center justify-center font-semibold tabular-nums",
              "text-[clamp(1.1rem,2.4vw,1.75rem)]",
              "transition-colors hover:bg-accent hover:text-accent-foreground",
              "disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {n}
            {!done && (
              <span className="absolute bottom-0.5 right-1.5 text-[10px] font-normal text-muted-foreground">
                {remaining}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
