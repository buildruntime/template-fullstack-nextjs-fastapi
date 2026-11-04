"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { idle } from "@/lib/form-state";
import { signInAction } from "../actions";

export function SignInForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, idle);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        defaultValue={values.email}
        error={errors.email}
        required
      />
      <Field
        name="password"
        type="password"
        label="Password"
        autoComplete="current-password"
        error={errors.password}
        required
      />
      <SubmitButton pending={pending} pendingLabel="Signing in…" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
