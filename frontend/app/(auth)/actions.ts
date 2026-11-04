"use server";

import { redirect } from "next/navigation";
import { apiErrorState, forwardedUserAgent } from "@/lib/actions";
import { apiFetch } from "@/lib/api/client";
import { issuedSessionSchema } from "@/lib/api/schemas";
import type { FormState } from "@/lib/form-state";
import { safeNextPath } from "@/lib/redirect";
import { setSessionToken } from "@/lib/session";
import { fieldErrors, formValues, registerSchema, signInSchema } from "@/lib/validation";

export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "password", "next"]);
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrors(parsed.error),
      values: { ...values, password: "" },
    };
  }

  try {
    const response = await apiFetch("/v1/auth/login", {
      method: "POST",
      json: { email: parsed.data.email, password: parsed.data.password },
      headers: await forwardedUserAgent(),
    });
    const session = issuedSessionSchema.parse(await response.json());
    await setSessionToken(session.token, session.expires_at);
  } catch (error) {
    return apiErrorState(error, { ...values, password: "" });
  }
  // redirect() throws, so it stays outside the try block.
  redirect(safeNextPath(parsed.data.next));
}

export async function registerAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["email", "name", "password"]);
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: fieldErrors(parsed.error),
      values: { ...values, password: "" },
    };
  }

  try {
    const response = await apiFetch("/v1/auth/register", {
      method: "POST",
      json: parsed.data,
      headers: await forwardedUserAgent(),
    });
    const session = issuedSessionSchema.parse(await response.json());
    await setSessionToken(session.token, session.expires_at);
  } catch (error) {
    return apiErrorState(error, { ...values, password: "" });
  }
  redirect("/dashboard?welcome=1");
}
