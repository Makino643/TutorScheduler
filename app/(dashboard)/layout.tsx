import { redirect } from "next/navigation";

import { DashboardMobileBar } from "@/components/dashboard-mobile-bar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { RoutePrefetcher } from "@/components/route-prefetcher";
import { auth } from "@/auth";
import { copy } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { getNextSessionMinutes } from "@/lib/next-session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const name = session.user.name ?? "Tutor";
  const email = session.user.email ?? "";
  const nextSessionMinutes = await getNextSessionMinutes();
  const locale = await getServerLocale();
  const navCopy = copy[locale].nav;
  const commonCopy = copy[locale].common;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <DashboardSidebar
          displayName={name}
          email={email}
          nextSessionMinutes={nextSessionMinutes}
          locale={locale}
          labels={{
            dashboard: navCopy.dashboard,
            students: navCopy.students,
            settings: navCopy.settings,
            signOut: commonCopy.signOut,
            scheduleUpToDate: navCopy.scheduleUpToDate,
            noUpcomingSessions: navCopy.noUpcomingSessions,
            nextSessionIn: navCopy.nextSessionIn,
            bookToSee: navCopy.bookToSee,
            lessThanMinute: navCopy.lessThanMinute,
            min: navCopy.min,
          }}
        />
        <div className="min-w-0 flex-1">
          <DashboardMobileBar
            displayName={name}
            email={email}
            nextSessionMinutes={nextSessionMinutes}
            locale={locale}
            labels={{
              menu: navCopy.menu,
              openMenu: navCopy.openMenu,
              closeMenu: navCopy.closeMenu,
            }}
          />
          <RoutePrefetcher />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
