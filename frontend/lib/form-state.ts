import type { FieldErrors } from "@/lib/validation";

/** What a form's Server Action returns, for useActionState. */
export type FormState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message?: string;
      fieldErrors: FieldErrors;
      // React resets a form after its action runs, so the action returns what was typed.
      values: Record<string, string>;
    };

export const idle: FormState = { status: "idle" };
