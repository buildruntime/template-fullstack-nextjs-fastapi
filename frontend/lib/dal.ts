import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { apiFetch } from "@/lib/api/client";
import { ApiError } from "@/lib/api/problem";
import {
  type Readiness,
  readinessSchema,
  type Session,
  sessionSchema,
  type User,
  type UserPage,
  userPageSchema,
  userSchema,
} from "@/lib/api/schemas";
import { getSessionToken } from "@/lib/session";

/**
 * The data access layer. Pages and Server Actions read data only through these functions, which
 * send the session token with every request. The API checks it every time: nothing here is
 * trusted for authorisation on its own.
 */

/** The signed-in user, or null. Cached for the duration of one request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = await getSessionToken();
  if (!token) return null;
  try {
    const response = await apiFetch("/v1/users/me", { token });
    return userSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in?reason=expired");
  return user;
}

/** Admin-only pages respond with 404 to everyone else, so that they do not reveal they exist. */
export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}

async function authedFetch(path: string): Promise<Response> {
  const token = await getSessionToken();
  if (!token) redirect("/sign-in?reason=expired");
  try {
    return await apiFetch(path, { token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/sign-in?reason=expired");
    throw error;
  }
}

export async function listMySessions(): Promise<Session[]> {
  const response = await authedFetch("/v1/users/me/sessions");
  return sessionSchema.array().parse(await response.json());
}

export async function listUsers(params: { cursor?: string; search?: string }): Promise<UserPage> {
  const query = new URLSearchParams({ limit: "20" });
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.search) query.set("search", params.search);
  const response = await authedFetch(`/v1/users?${query.toString()}`);
  return userPageSchema.parse(await response.json());
}

/** The API's readiness report. A 503 still carries the per-dependency checks. */
export async function getReadiness(): Promise<Readiness | null> {
  try {
    const response = await apiFetch("/health/ready");
    return readinessSchema.parse(await response.json());
  } catch (error) {
    if (error instanceof ApiError && error.status === 503) {
      return { status: "unavailable", checks: {} };
    }
    return null;
  }
}
