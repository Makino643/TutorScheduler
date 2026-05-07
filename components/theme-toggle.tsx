"use client";

import { Moon, Sparkles, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const STORAGE_KEY = "tutorflow-theme";
const THEME_ORDER = ["default", "neo-dark", "neo-light"] as const;
type ThemeMode = (typeof THEME_ORDER)[number];

type Variant = "ghost" | "outline";

type Props = {
  variant?: Variant;
  className?: string;
};

function applyTheme(root: HTMLElement, mode: ThemeMode): void {
  root.classList.remove("theme-neo-dark", "theme-neo-light");
  if (mode === "neo-dark") {
    root.classList.add("theme-neo-dark", "dark");
    return;
  }
  if (mode === "neo-light") {
    root.classList.add("theme-neo-light");
    root.classList.remove("dark");
    return;
  }
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.toggle("dark", prefersDark);
}

export function ThemeToggle({ variant = "ghost", className }: Props) {
  const [theme, setTheme] = useState<ThemeMode>("default");

  useEffect(() => {
    const root = document.documentElement;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const initial: ThemeMode =
      saved === "neo-dark" || saved === "neo-light" || saved === "default"
        ? saved
        : "default";
    applyTheme(root, initial);
    setTheme(initial);
  }, []);

  const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
  const icon =
    theme === "neo-dark" ? (
      <Moon className="h-4 w-4" aria-hidden />
    ) : theme === "neo-light" ? (
      <Sun className="h-4 w-4" aria-hidden />
    ) : (
      <Sparkles className="h-4 w-4" aria-hidden />
    );
  const currentLabel =
    theme === "default"
      ? "Default theme"
      : theme === "neo-dark"
        ? "Neo dark theme"
        : "Neo light theme";
  const nextLabel =
    next === "default"
      ? "Default theme"
      : next === "neo-dark"
        ? "Neo dark theme"
        : "Neo light theme";

  return (
    <button
      type="button"
      onClick={() => {
        const root = document.documentElement;
        applyTheme(root, next);
        window.localStorage.setItem(STORAGE_KEY, next);
        setTheme(next);
      }}
      aria-label={`${currentLabel}. Switch to ${nextLabel}`}
      title={`${currentLabel}. Click to switch to ${nextLabel}`}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variant === "outline"
          ? "border border-border bg-background hover:bg-muted"
          : "border border-transparent text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground",
        className,
      )}
    >
      {icon}
    </button>
  );
}
