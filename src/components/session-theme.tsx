"use client";

import { useEffect } from "react";

const SESSION_THEME_KEY = "sudoku-session-theme-v1";
const SESSION_FONT_KEY = "sudoku-session-font-v1";

const THEMES = ["sunrise", "harbor", "citrus", "ember"] as const;
const FONTS = ["manrope", "space", "sora"] as const;

function pickRandom<T>(values: readonly T[]) {
  return values[Math.floor(Math.random() * values.length)];
}

function applySessionAppearance(theme: string, font: string) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.font = font;
  sessionStorage.setItem(SESSION_THEME_KEY, theme);
  sessionStorage.setItem(SESSION_FONT_KEY, font);
}

export function startNewVisualSession() {
  applySessionAppearance(pickRandom(THEMES), pickRandom(FONTS));
}

export function clearVisualSession() {
  sessionStorage.removeItem(SESSION_THEME_KEY);
  sessionStorage.removeItem(SESSION_FONT_KEY);
  startNewVisualSession();
}

export function SessionTheme() {
  useEffect(() => {
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

    applySessionAppearance(theme, font);
  }, []);

  return null;
}
