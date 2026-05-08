"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { type Locale, copy } from "@/lib/i18n";

type Props = { locale: Locale };

export function LoginForm({ locale }: Props) {
  const authCopy = copy[locale].auth;
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-card p-8 shadow-sm">
      <div className="mb-3 flex justify-end">
        <LanguageToggle locale={locale} variant="outline" />
      </div>
      <h1 className="text-center text-xl font-semibold text-card-foreground">
        TutorFlow
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {authCopy.signInTitle}
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setPending(true);
          const form = e.currentTarget;
          const email = (form.elements.namedItem("email") as HTMLInputElement)
            .value;
          const password = (
            form.elements.namedItem("password") as HTMLInputElement
          ).value;
          try {
            const res = await signIn("credentials", {
              email,
              password,
              redirect: false,
              callbackUrl,
            });
            if (res?.error) {
              setError(authCopy.invalidCredentials);
              setPending(false);
              return;
            }
            if (res?.url) {
              window.location.href = res.url;
              return;
            }
            window.location.href = callbackUrl;
          } catch {
            setError(authCopy.genericError);
            setPending(false);
          }
        }}
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {authCopy.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            lang="en"
            dir="ltr"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            {authCopy.password}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            lang="en"
            dir="ltr"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-2"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? authCopy.signingIn : authCopy.signIn}
        </Button>
      </form>
    </div>
  );
}
