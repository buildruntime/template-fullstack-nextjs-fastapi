import { CircleAlert, CircleCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "@/lib/form-state";

/** The form-level result of an action, announced to screen readers. */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "success") {
    return (
      <Alert role="status">
        <CircleCheck aria-hidden />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  if (state.status === "error" && state.message) {
    return (
      <Alert variant="destructive" role="alert">
        <CircleAlert aria-hidden />
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
