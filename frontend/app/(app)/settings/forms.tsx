"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Field } from "@/components/forms/field";
import { FormMessage } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FormState, idle } from "@/lib/form-state";
import { changePasswordAction, updateProfileAction } from "../actions";

function useSuccessToast(state: FormState) {
  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
  }, [state]);
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, idle);
  useSuccessToast(state);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const value = state.status === "error" ? state.values.name : name;

  return (
    <form action={formAction} noValidate className="grid max-w-md gap-5">
      {state.status === "error" && <FormMessage state={state} />}
      <Field
        name="name"
        label="Name"
        autoComplete="name"
        defaultValue={value}
        error={errors.name}
        required
      />
      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} readOnly disabled aria-describedby="email-hint" />
        <p id="email-hint" className="text-xs text-muted-foreground">
          Your email address is your sign-in name and cannot be changed here.
        </p>
      </div>
      <div>
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, idle);
  useSuccessToast(state);
  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <form action={formAction} noValidate className="grid max-w-md gap-5">
      <FormMessage state={state} />
      <Field
        name="current_password"
        type="password"
        label="Current password"
        autoComplete="current-password"
        error={errors.current_password}
        required
      />
      <Field
        name="new_password"
        type="password"
        label="New password"
        autoComplete="new-password"
        hint="At least 12 characters."
        error={errors.new_password}
        required
      />
      <Field
        name="confirm_password"
        type="password"
        label="Repeat new password"
        autoComplete="new-password"
        error={errors.confirm_password}
        required
      />
      <div>
        <SubmitButton pending={pending} pendingLabel="Changing password…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}
