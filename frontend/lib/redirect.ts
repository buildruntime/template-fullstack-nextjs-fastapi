/**
 * Where to go after signing in. Only same-origin paths are allowed, so that a crafted
 * ?next= link cannot send the user to another site (an open redirect).
 */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  // Must be a path on this origin: starts with one "/", and not "//" or "/\" (protocol-relative).
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    if (url.pathname === "/sign-in" || url.pathname === "/register") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
