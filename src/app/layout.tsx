import type { Metadata } from "next";
import {
  JetBrains_Mono,
  Manrope,
  Sora,
  Space_Grotesk,
} from "next/font/google";

import { SessionTheme } from "@/components/session-theme";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const siteTitle = "Sudoku by Ankur Jaiswal";
const siteDescription =
  "Play a fast, responsive Sudoku game by Ankur Jaiswal. Enjoy a clean board, mobile-friendly controls, and a polished web Sudoku experience.";
const githubUrl = "https://github.com/ankurjaiswalofficial/game_sudoku";

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s | Sudoku by Ankur Jaiswal",
  },
  description: siteDescription,
  applicationName: "Sudoku",
  keywords: [
    "Sudoku",
    "online Sudoku",
    "responsive Sudoku game",
    "web Sudoku",
    "Sudoku puzzle",
    "mobile Sudoku",
    "Ankur Jaiswal",
    "ankurjaiswalofficial",
    "GitHub Sudoku project",
  ],
  authors: [{ name: "Ankur Jaiswal", url: "https://github.com/ankurjaiswalofficial" }],
  creator: "Ankur Jaiswal",
  publisher: "Ankur Jaiswal",
  category: "games",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    siteName: siteTitle,
    locale: "en_US",
    url: githubUrl,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    creator: "@ankurjaiswalofficial",
  },
  other: {
    "theme-color": "oklch(0.97 0.02 70)",
    "github:repo": githubUrl,
    "author": "Ankur Jaiswal",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${sora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <SessionTheme />
        {children}
      </body>
    </html>
  );
}
