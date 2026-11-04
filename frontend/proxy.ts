import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIES = ["__Host-session", "session"];

/**
 * An optimistic check before rendering: without a session cookie, protected pages redirect to
 * sign-in straight away. This is a convenience, not access control. The API verifies the token
 * on every request, and pages and Server Actions handle a rejected token themselves.
 */
export function proxy(request: NextRequest) {
  const hasSession = SESSION_COOKIES.some((name) => request.cookies.has(name));
  if (!hasSession) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/admin/:path*"],
};
