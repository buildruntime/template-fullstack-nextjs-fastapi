import "server-only";
import { toApiError } from "@/lib/api/problem";
import { env } from "@/lib/env";

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  token?: string;
  json?: unknown;
};

/**
 * Calls the FastAPI backend from the Next.js server. Adds the session token, a timeout and JSON
 * handling, and throws ApiError for any response that is not 2xx.
 */
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { token, json, headers: extraHeaders, ...init } = options;
  const headers = new Headers(extraHeaders);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (json !== undefined) headers.set("Content-Type", "application/json");

  const response = await fetch(new URL(path, env().API_URL), {
    ...init,
    headers,
    body: json === undefined ? undefined : JSON.stringify(json),
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw await toApiError(response);
  }
  return response;
}
