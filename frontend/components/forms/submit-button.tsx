"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = ComponentProps<typeof Button> & {
  pending: boolean;
  pendingLabel: string;
};

export function SubmitButton({ pending, pendingLabel, children, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending} {...props}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
