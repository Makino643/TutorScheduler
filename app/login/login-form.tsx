"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-card p-8 shadow-sm">
      <h1 className="text-center text-xl font-semibold text-card-foreground">
        TutorFlow
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Sign in to your tutor account
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
              setError("Invalid email or password.");
              setPending(false);
              return;
            }
            if (res?.url) {
              window.location.href = res.url;
              return;
            }
            window.location.href = callbackUrl;
          } catch {
            setError("Something went wrong. Try again.");
            setPending(false);
          }
        }}
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus-visible:ring-2"
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
