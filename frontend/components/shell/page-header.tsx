import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div className="grid gap-2">
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">{eyebrow}</p>
        <h1 className="text-3xl leading-tight">{title}</h1>
        {description && <p className="max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

/** A bordered section: the building block of every page, instead of floating cards. */
export function Panel({
  title,
  description,
  children,
  id,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className={`rounded-lg border border-border bg-card ${className}`}
    >
      <header className="border-b border-border px-5 py-4">
        <h2 id={id ? `${id}-title` : undefined} className="text-base">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
