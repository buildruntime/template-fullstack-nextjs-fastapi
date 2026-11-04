"use client";

import { useActionState } from "react";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { idle } from "@/lib/form-state";
import { registerAction } from "../actions";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, idle);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const values = state.status === "error" ? state.values : {};

  return (
    <form action={formAction} noValidate className="grid gap-5">
      <FormMessage state={state} />
      <Field
        name="name"
        label="Name"
        autoComplete="name"
        defaultValue={values.name}
        error={errors.name}
        required
      />
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
        autoComplete="new-password"
        hint="At least 12 characters. A few unrelated words work well."
        error={errors.password}
        required
      />
      <SubmitButton pending={pending} pendingLabel="Creating account…" className="mt-1 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
