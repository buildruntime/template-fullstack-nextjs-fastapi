"use client";

import { MoreHorizontal } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/api/schemas";
import { updateUserAction } from "../../actions";

export function UserActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();

  function apply(change: { role: "user" | "admin" } | { is_active: boolean }) {
    startTransition(async () => {
      const result = await updateUserAction(user.id, change);
      if (result.ok) {
        toast.success(`${user.name}: ${result.message}`);
      } else {
        toast.error(result.message);
      }
    });
  }

  // The API refuses these for your own account too. Hiding them avoids offering a dead end.
  if (isSelf) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          aria-label={`Actions for ${user.name}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.role === "user" ? (
          <DropdownMenuItem onSelect={() => apply({ role: "admin" })}>Make admin</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => apply({ role: "user" })}>
            Remove admin role
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {user.is_active ? (
          <DropdownMenuItem variant="destructive" onSelect={() => apply({ is_active: false })}>
            Deactivate account
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => apply({ is_active: true })}>
            Reactivate account
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
