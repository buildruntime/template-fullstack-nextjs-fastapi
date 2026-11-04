import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

const stack: [string, string][] = [
  ["Frontend", "Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui"],
  ["Backend", "FastAPI, Pydantic, SQLAlchemy 2, Alembic migrations"],
  ["Data", "PostgreSQL, with Redis for sign-in rate limiting"],
  ["Auth", "Argon2id passwords, revocable server-side sessions, user and admin roles"],
  ["Quality", "Pytest, Vitest and Playwright, run by GitHub Actions"],
  ["Delivery", "Docker Compose for development, multi-stage production images"],
];

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 sm:px-8">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </header>

      <main className="grid flex-1 content-center gap-12 py-12 md:grid-cols-[1fr_1.1fr] md:gap-16">
        <section className="flex flex-col justify-center gap-6">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Full-stack starter
          </p>
          <h1 className="text-4xl leading-[1.06] sm:text-5xl">
            A working foundation, not a folder structure.
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            Sign-in, user management, migrations, structured logs, tests and CI are already wired
            together. Create an account to see the application it gives you.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/register">Create an account</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="stack-heading" className="self-center">
          <h2 id="stack-heading" className="sr-only">
            What is included
          </h2>
          <dl className="border-t border-border">
            {stack.map(([term, detail]) => (
              <div
                key={term}
                className="grid gap-1 border-b border-border py-4 sm:grid-cols-[7rem_1fr] sm:gap-6"
              >
                <dt className="font-mono text-xs leading-6 tracking-wide uppercase">{term}</dt>
                <dd className="text-sm leading-6 text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className="flex h-16 items-center text-sm">
        <p>
          Software engineering,{" "}
          <span className="text-muted-foreground">from build to runtime.</span>
        </p>
      </footer>
    </div>
  );
}
