"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

type Props = {
  displayName: string;
  email: string;
};

export function DashboardHeader({ displayName, email }: Props) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground">TutorFlow</p>
        <p className="text-base font-semibold text-card-foreground">
          {displayName}
        </p>
        <p className="text-xs text-muted-foreground">{email}</p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </Button>
    </header>
  );
}
