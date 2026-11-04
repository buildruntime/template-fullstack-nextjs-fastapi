import type { Metadata } from "next";
import Link from "next/link";
import { Panel, PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getReadiness, listMySessions, requireUser } from "@/lib/dal";
import { describeUserAgent, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const checkLabel: Record<string, string> = {
  ok: "Operational",
  unavailable: "Unavailable",
  not_configured: "Not configured",
};

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const [user, sessions, readiness, { welcome }] = await Promise.all([
    requireUser(),
    listMySessions(),
    getReadiness(),
    searchParams,
  ]);
  const firstName = user.name.split(/\s+/)[0] ?? user.name;
  const current = sessions.find((session) => session.current);
  const checks = Object.entries({ api: readiness ? "ok" : "unavailable", ...readiness?.checks });

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title={welcome ? `Welcome, ${firstName}` : `Welcome back, ${firstName}`}
        description={
          welcome
            ? "Your account is ready. Everything on this page comes from the FastAPI backend."
            : "Your account, your sessions, and the services this application depends on."
        }
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Panel title="Account">
          <dl className="divide-y divide-border">
            <Row term="Email">{user.email}</Row>
            <Row term="Role">
              <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
            </Row>
            <Row term="Member since">{formatDate(user.created_at)}</Row>
            <Row term="Last sign-in">{formatDateTime(user.last_login_at)}</Row>
          </dl>
        </Panel>

        <Panel title="Sessions">
          <p className="text-3xl font-medium tracking-tight">{sessions.length}</p>
          <p className="mb-4 text-sm text-muted-foreground">
            active {sessions.length === 1 ? "session" : "sessions"}. This one is{" "}
            {describeUserAgent(current?.user_agent ?? null)}.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings#sessions">Manage sessions</Link>
          </Button>
        </Panel>

        <Panel title="System status" description="Reported by the API's readiness check.">
          <ul className="grid gap-2 text-sm">
            {checks.map(([name, state]) => (
              <li key={name} className="flex items-center justify-between gap-4">
                <span className="capitalize">{name === "api" ? "API" : name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    aria-hidden
                    className={cn(
                      "size-1.5 rounded-full",
                      state === "ok" && "bg-foreground",
                      state === "unavailable" && "bg-signal",
                      state === "not_configured" && "border border-muted-foreground",
                    )}
                  />
                  {checkLabel[state] ?? state}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Build on this" description="Where to start when you extend the template.">
          <ul className="grid gap-3 text-sm">
            <li>
              <code className="font-mono text-xs">backend/app/users/</code>
              <p className="text-muted-foreground">
                A feature: model, repository, service, router.
              </p>
            </li>
            <li>
              <code className="font-mono text-xs">frontend/lib/dal.ts</code>
              <p className="text-muted-foreground">Every read from the API goes through here.</p>
            </li>
            {user.role === "admin" ? (
              <li>
                <Link href="/admin/users" className="underline underline-offset-4">
                  Manage users
                </Link>
                <p className="text-muted-foreground">Change roles and deactivate accounts.</p>
              </li>
            ) : (
              <li>
                <code className="font-mono text-xs">
                  python -m app.cli create-user --role admin
                </code>
                <p className="text-muted-foreground">
                  Creates an administrator from the command line.
                </p>
              </li>
            )}
          </ul>
        </Panel>
      </div>
    </>
  );
}
