import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNav } from "@/components/dashboard-nav";
import { RoutePrefetcher } from "@/components/route-prefetcher";
import { auth } from "@/auth";

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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader displayName={name} email={email} />
      <DashboardNav />
      <RoutePrefetcher />
      <div className="p-6">{children}</div>
    </div>
  );
}
