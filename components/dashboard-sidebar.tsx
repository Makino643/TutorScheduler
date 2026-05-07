"use client";

import {
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  UserRound,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { type Locale, replaceTemplate } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
};

const items: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href || pathname.startsWith("/dashboard/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  displayName: string;
  email: string;
  nextSessionMinutes: number | null;
  locale: Locale;
  labels: {
    dashboard: string;
    students: string;
    settings: string;
    signOut: string;
    scheduleUpToDate: string;
    noUpcomingSessions: string;
    nextSessionIn: string;
    bookToSee: string;
    lessThanMinute: string;
    min: string;
  };
  className?: string;
  /** When true, render without sticky positioning (used inside a mobile drawer). */
  inDrawer?: boolean;
};

export function DashboardSidebar({
  displayName,
  email,
  nextSessionMinutes,
  locale,
  labels,
  className,
  inDrawer = false,
}: Props) {
  const pathname = usePathname() ?? "/dashboard";

  const statusHeadline =
    nextSessionMinutes != null && nextSessionMinutes >= 0
      ? labels.scheduleUpToDate
      : labels.noUpcomingSessions;
  const statusDetail =
    nextSessionMinutes != null && nextSessionMinutes >= 0
      ? replaceTemplate(labels.nextSessionIn, {
          time: formatMinutes(nextSessionMinutes, labels.lessThanMinute, labels.min),
        })
      : labels.bookToSee;

  return (
    <aside
      aria-label="Primary"
      className={cn(
        "flex w-64 shrink-0 flex-col gap-5 border-r border-sidebar-border bg-sidebar p-4 text-sidebar-foreground",
        inDrawer ? "h-full" : "sticky top-0 hidden h-screen md:flex",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-1 pt-1">
        <span
          aria-hidden
          className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30"
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="text-base font-semibold tracking-tight">TutorFlow</span>
      </div>

      <div className="h-px w-full bg-sidebar-border/60" aria-hidden />

      <nav aria-label="Main" className="flex-1">
        <ul className="space-y-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-sm font-medium",
                    "outline-none transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    active
                      ? "bg-sidebar-active text-sidebar-active-foreground shadow-[inset_0_0_0_1px_var(--sidebar-active-border)]"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-hover hover:text-sidebar-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity",
                      active ? "bg-primary opacity-100" : "opacity-0",
                    )}
                  />
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-md transition-colors",
                      active
                        ? "bg-primary/15 text-primary"
                        : "bg-transparent text-sidebar-foreground/70 group-hover:bg-white/5",
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="truncate">
                    {item.href === "/dashboard"
                      ? labels.dashboard
                      : item.href === "/students"
                        ? labels.students
                        : labels.settings}
                  </span>
                  {active ? <span className="sr-only">(current page)</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="h-px w-full bg-sidebar-border/60" aria-hidden />

      <div className="rounded-xl bg-sidebar-hover/80 p-3 text-xs text-sidebar-foreground/80 ring-1 ring-sidebar-border/60">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-full bg-primary/20 text-primary ring-1 ring-primary/30"
          >
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-sidebar-foreground">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">
              {email}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg bg-black/15 px-2.5 py-2">
          <Zap
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
            aria-hidden
          />
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-sidebar-foreground">
              {statusHeadline}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">
              {statusDetail}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <LanguageToggle locale={locale} />
          <ThemeToggle />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={cn(
              "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-sidebar-border/60 bg-transparent px-3 text-[12px]",
              "outline-none transition-colors hover:bg-sidebar-hover",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            )}
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span>{labels.signOut}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function formatMinutes(total: number, lessThanMinute: string, minLabel: string): string {
  if (total < 1) return lessThanMinute;
  if (total < 60) return `${total} ${minLabel}`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours < 24) {
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
