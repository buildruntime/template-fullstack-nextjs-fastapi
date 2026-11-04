import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/problem";
import type { FormState } from "@/lib/form-state";
import { clearSessionToken, getSessionToken } from "@/lib/session";

/** Helpers shared by the Server Actions in app/. */

/** The token for an action that needs a signed-in user. Without one, start again at sign-in. */
export async function requireToken(): Promise<string> {
  const token = await getSessionToken();
  if (!token) redirect("/sign-in?reason=expired");
  return token;
}

/** Call the API on behalf of the signed-in user. A 401 ends the session in the browser too. */
export async function authedApi(
  path: string,
  init: Parameters<typeof apiFetch>[1] = {},
): Promise<Response> {
  const token = await requireToken();
  try {
    return await apiFetch(path, { ...init, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      await clearSessionToken();
      redirect("/sign-in?reason=expired");
    }
    throw error;
  }
}

export async function forwardedUserAgent(): Promise<Record<string, string>> {
  const userAgent = (await headers()).get("user-agent");
  return userAgent ? { "User-Agent": userAgent.slice(0, 255) } : {};
}

/**
 * Turn an expected API error into form state. Validation errors are mapped to their fields;
 * anything unexpected is rethrown, and the nearest error.tsx shows it.
 */
export function apiErrorState(error: unknown, values: Record<string, string>): FormState {
  if (!(error instanceof ApiError) || error.status >= 500) throw error;
  const fieldErrors: Record<string, string> = {};
  for (const item of error.problem.errors ?? []) {
    const field = item.location.replace(/^body\./, "");
    fieldErrors[field] ??= item.message;
  }
  let message = error.problem.errors?.length ? undefined : error.problem.detail;
  if (error.code === "rate_limited" && error.retryAfter) {
    const minutes = Math.max(1, Math.ceil(error.retryAfter / 60));
    message = `${error.problem.detail} You can try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  }
  return { status: "error", message, fieldErrors, values };
}
