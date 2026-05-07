import { Suspense } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { copy } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  const locale = await getServerLocale();
  const commonCopy = copy[locale].common;
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-8">
      <Suspense fallback={<div className="text-sm text-muted-foreground">{commonCopy.loading}</div>}>
        <LoginForm locale={locale} />
      </Suspense>
    </main>
  );
}
