"use client";

import { cn } from "@/lib/utils";

type Props = {
  counts: Record<number, number>;
  onNumber: (n: number) => void;
  notesMode: boolean;
};

export function NumberPad({ counts, onNumber, notesMode }: Props) {
  return (
    <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-9 sm:gap-2.5">
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
              "relative aspect-square w-full rounded-2xl border border-border/80 bg-background/80 text-card-foreground shadow-sm backdrop-blur-sm",
              "flex items-center justify-center font-semibold tabular-nums",
              "text-[clamp(1.3rem,5vw,1.85rem)] sm:text-[clamp(1.05rem,2vw,1.55rem)]",
              "transition-[background-color,color,transform,box-shadow] hover:bg-accent hover:text-accent-foreground active:scale-[0.985]",
              "disabled:pointer-events-none disabled:opacity-35 cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            {n}
            {!done && (
              <span className="absolute bottom-1.5 right-2 text-[0.7rem] font-medium text-muted-foreground sm:bottom-1 sm:right-1.5 sm:text-[0.62rem]">
                {remaining}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
