import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * The session token lives in an HttpOnly cookie on the Next.js origin. The browser never sees
 * the API, and JavaScript on the page cannot read the token.
 */
function cookieSettings() {
  const { NODE_ENV, SESSION_COOKIE_SECURE } = env();
  const secure = SESSION_COOKIE_SECURE
    ? SESSION_COOKIE_SECURE === "true"
    : NODE_ENV === "production";
  // The __Host- prefix makes browsers refuse the cookie unless it is Secure, has Path=/ and no
  // Domain, so it cannot be set or overwritten by a subdomain.
  return { name: secure ? "__Host-session" : "session", secure };
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(cookieSettings().name)?.value;
}

export async function setSessionToken(token: string, expiresAt: string): Promise<void> {
  const { name, secure } = cookieSettings();
  (await cookies()).set(name, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionToken(): Promise<void> {
  const { name, secure } = cookieSettings();
  // Overwrite with the same attributes rather than cookies().delete(): browsers ignore any
  // Set-Cookie for a __Host- cookie that lacks Secure, so a bare deletion would be dropped.
  (await cookies()).set(name, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
