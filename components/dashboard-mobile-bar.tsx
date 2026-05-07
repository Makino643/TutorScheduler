"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { type Locale, copy } from "@/lib/i18n";

type Props = {
  displayName: string;
  email: string;
  nextSessionMinutes: number | null;
  locale: Locale;
  labels: {
    menu: string;
    openMenu: string;
    closeMenu: string;
  };
};

export function DashboardMobileBar({
  displayName,
  email,
  nextSessionMinutes,
  locale,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-border bg-card px-3 py-2.5">
        <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
          <DialogPrimitive.Trigger asChild>
            <button
              type="button"
              aria-label={labels.openMenu}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Menu className="h-4 w-4" aria-hidden />
            </button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
            <DialogPrimitive.Content
              className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
              aria-label="Navigation drawer"
            >
              <div className="flex items-center justify-between border-b border-sidebar-border px-3 py-2.5">
                <DialogPrimitive.Title className="text-sm font-semibold">
                  {labels.menu}
                </DialogPrimitive.Title>
                <DialogPrimitive.Close
                  aria-label={labels.closeMenu}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                >
                  <X className="h-4 w-4" aria-hidden />
                </DialogPrimitive.Close>
              </div>
              <DashboardSidebar
                inDrawer
                displayName={displayName}
                email={email}
                nextSessionMinutes={nextSessionMinutes}
                locale={locale}
                labels={{
                  dashboard: copy[locale].nav.dashboard,
                  students: copy[locale].nav.students,
                  settings: copy[locale].nav.settings,
                  signOut: copy[locale].common.signOut,
                  scheduleUpToDate: copy[locale].nav.scheduleUpToDate,
                  noUpcomingSessions: copy[locale].nav.noUpcomingSessions,
                  nextSessionIn: copy[locale].nav.nextSessionIn,
                  bookToSee: copy[locale].nav.bookToSee,
                  lessThanMinute: copy[locale].nav.lessThanMinute,
                  min: copy[locale].nav.min,
                }}
                className="flex w-full border-r-0"
              />
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary ring-1 ring-primary/30"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-sm font-semibold">TutorFlow</span>
        </div>

        <div className="flex items-center gap-1.5">
          <LanguageToggle locale={locale} variant="outline" />
          <ThemeToggle variant="outline" />
        </div>
      </div>
    </div>
  );
}
