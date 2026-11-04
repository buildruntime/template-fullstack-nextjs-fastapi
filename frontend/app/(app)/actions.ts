"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { apiErrorState, authedApi } from "@/lib/actions";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/problem";
import type { FormState } from "@/lib/form-state";
import { clearSessionToken, getSessionToken } from "@/lib/session";
import { fieldErrors, formValues, passwordChangeSchema, profileSchema } from "@/lib/validation";

// Every action below is a public endpoint. Each one sends the user's own token, and the API
// decides whether the user may do it. Nothing is trusted because the button was visible.

export async function signOutAction(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    try {
      await apiFetch("/v1/auth/logout", { method: "POST", token });
    } catch (error) {
      // An expired session is already signed out. Anything else is unexpected.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
  }
  await clearSessionToken();
  redirect("/sign-in?reason=signed-out");
}

export async function updateProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, ["name"]);
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error), values };
  try {
    await authedApi("/v1/users/me", { method: "PATCH", json: parsed.data });
  } catch (error) {
    return apiErrorState(error, values);
  }
  refresh();
  return { status: "success", message: "Profile saved." };
}

export async function changePasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData, ["current_password", "new_password", "confirm_password"]);
  const empty = { current_password: "", new_password: "", confirm_password: "" };
  const parsed = passwordChangeSchema.safeParse(values);
  if (!parsed.success)
    return { status: "error", fieldErrors: fieldErrors(parsed.error), values: empty };
  try {
    const response = await authedApi("/v1/users/me/password", {
      method: "POST",
      json: {
        current_password: parsed.data.current_password,
        new_password: parsed.data.new_password,
      },
    });
    const { signed_out_sessions } = z
      .object({ signed_out_sessions: z.number() })
      .parse(await response.json());
    refresh();
    const others =
      signed_out_sessions === 1
        ? "1 other session was"
        : `${signed_out_sessions} other sessions were`;
    return { status: "success", message: `Password changed. ${others} signed out.` };
  } catch (error) {
    const state = apiErrorState(error, empty);
    if (
      state.status === "error" &&
      error instanceof ApiError &&
      error.code === "incorrect_password"
    ) {
      return {
        ...state,
        message: undefined,
        fieldErrors: { current_password: error.problem.detail },
      };
    }
    return state;
  }
}

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(sessionId).success) return { ok: false, message: "Unknown session." };
  try {
    await authedApi(`/v1/users/me/sessions/${sessionId}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError && error.status < 500)
      return { ok: false, message: error.problem.detail };
    throw error;
  }
  refresh();
  return { ok: true, message: "Session signed out." };
}

const adminChangeSchema = z.union([
  z.object({ role: z.enum(["user", "admin"]) }),
  z.object({ is_active: z.boolean() }),
]);

export async function updateUserAction(userId: string, change: unknown): Promise<ActionResult> {
  const parsed = adminChangeSchema.safeParse(change);
  if (!z.uuid().safeParse(userId).success || !parsed.success) {
    return { ok: false, message: "That change is not valid." };
  }
  try {
    await authedApi(`/v1/users/${userId}`, { method: "PATCH", json: parsed.data });
  } catch (error) {
    if (error instanceof ApiError && error.status < 500)
      return { ok: false, message: error.problem.detail };
    throw error;
  }
  refresh();
  const message =
    "role" in parsed.data
      ? `Role changed to ${parsed.data.role}.`
      : parsed.data.is_active
        ? "Account reactivated."
        : "Account deactivated and signed out everywhere.";
  return { ok: true, message };
}
