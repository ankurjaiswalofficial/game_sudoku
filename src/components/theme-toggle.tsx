"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

const THEME_KEY = "sudoku-color-mode-v1";

type Mode = "light" | "dark";

function applyMode(mode: Mode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Mode | null;
    const initial: Mode =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    applyMode(initial);
    setMode(initial);
  }, []);

  const toggle = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    applyMode(next);
    localStorage.setItem(THEME_KEY, next);
    setMode(next);
  };

  const isDark = mode === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className="rounded-xl bg-background/75"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
