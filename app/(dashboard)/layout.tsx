import { redirect } from "next/navigation";

import { DashboardMobileBar } from "@/components/dashboard-mobile-bar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { RoutePrefetcher } from "@/components/route-prefetcher";
import { auth } from "@/auth";
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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <DashboardSidebar
          displayName={name}
          email={email}
          nextSessionMinutes={nextSessionMinutes}
        />
        <div className="min-w-0 flex-1">
          <DashboardMobileBar
            displayName={name}
            email={email}
            nextSessionMinutes={nextSessionMinutes}
          />
          <RoutePrefetcher />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
