"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-[60dvh] w-full max-w-xl flex-col items-start justify-center gap-4 px-5">
      <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">Error</p>
      <h1 className="text-3xl">Something went wrong.</h1>
      <p className="text-sm text-muted-foreground">
        The problem has been logged. Try again, and if it continues, quote this reference:{" "}
        <code className="font-mono text-xs">{error.digest ?? "none"}</code>
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
