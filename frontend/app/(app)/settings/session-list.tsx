"use client";

import { Laptop } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Session } from "@/lib/api/schemas";
import { describeUserAgent, formatDateTime } from "@/lib/format";
import { revokeSessionAction } from "../actions";

function SessionRow({ session }: { session: Session }) {
  const [pending, startTransition] = useTransition();
  const device = describeUserAgent(session.user_agent);

  function revoke() {
    startTransition(async () => {
      const result = await revokeSessionAction(session.id);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <Laptop className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">
          {device}
          {session.current && <Badge variant="secondary">This device</Badge>}
        </p>
        <p className="text-xs text-muted-foreground">
          Signed in {formatDateTime(session.created_at)} · last active{" "}
          {formatDateTime(session.last_used_at)}
        </p>
      </div>
      {!session.current && (
        <Button
          variant="outline"
          size="sm"
          onClick={revoke}
          disabled={pending}
          aria-label={`Sign out ${device}, signed in ${formatDateTime(session.created_at)}`}
        >
          {pending ? "Signing out…" : "Sign out"}
        </Button>
      )}
    </li>
  );
}

export function SessionList({ sessions }: { sessions: Session[] }) {
  return (
    <ul className="-my-3 divide-y divide-border">
      {sessions.map((session) => (
        <SessionRow key={session.id} session={session} />
      ))}
    </ul>
  );
}
