"use client";

import { useEffect } from "react";

const SESSION_THEME_KEY = "sudoku-session-theme-v1";
const SESSION_FONT_KEY = "sudoku-session-font-v1";

const THEMES = ["sunrise", "harbor", "citrus", "ember"] as const;
const FONTS = ["manrope", "space", "sora"] as const;

function pickRandom<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

export function SessionTheme() {
  useEffect(() => {
    const root = document.documentElement;

    const savedTheme = sessionStorage.getItem(SESSION_THEME_KEY);
    const savedFont = sessionStorage.getItem(SESSION_FONT_KEY);

    const theme =
      savedTheme && THEMES.includes(savedTheme as (typeof THEMES)[number])
        ? savedTheme
        : pickRandom(THEMES);
    const font =
      savedFont && FONTS.includes(savedFont as (typeof FONTS)[number])
        ? savedFont
        : pickRandom(FONTS);

    sessionStorage.setItem(SESSION_THEME_KEY, theme);
    sessionStorage.setItem(SESSION_FONT_KEY, font);

    root.dataset.theme = theme;
    root.dataset.font = font;
  }, []);

  return null;
}
