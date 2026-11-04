import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 sm:px-8">
      <header className="flex h-16 items-center">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col items-start justify-center gap-4 pb-24">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">404</p>
        <h1 className="text-3xl">This page does not exist.</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          It may have moved, or you may not have access to it.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to the dashboard</Link>
        </Button>
      </main>
    </div>
  );
}
