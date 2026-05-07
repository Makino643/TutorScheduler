"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { type Locale, setLocaleCookieDocument } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  locale: Locale;
  variant?: "ghost" | "outline";
  className?: string;
};

export function LanguageToggle({ locale, variant = "ghost", className }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next: Locale = locale === "en" ? "zh" : "en";
  const label = locale === "en" ? "EN" : "\u4E2D";
  const nextLabel = next === "en" ? "English" : "\u4E2D\u6587";

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setLocaleCookieDocument(next);
        startTransition(() => {
          router.refresh();
        });
      }}
      aria-label={`Switch language to ${nextLabel}`}
      title={`Switch language to ${nextLabel}`}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variant === "outline"
          ? "border border-border bg-background hover:bg-muted"
          : "border border-transparent text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground",
        className,
      )}
    >
      <Languages className="h-3.5 w-3.5" aria-hidden />
      <span>{label}</span>
    </button>
  );
}
