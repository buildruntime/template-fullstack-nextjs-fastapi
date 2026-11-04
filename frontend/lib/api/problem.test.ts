import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "./problem";

function problemResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 409,
    headers: { "Content-Type": "application/problem+json", ...init.headers },
    ...init,
  });
}

describe("toApiError", () => {
  it("reads Problem Details into a typed error", async () => {
    const error = await toApiError(
      problemResponse({
        type: "about:blank",
        title: "Conflict",
        status: 409,
        detail: "An account with this email address already exists.",
        code: "email_taken",
      }),
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("email_taken");
    expect(error.status).toBe(409);
    expect(error.message).toBe("An account with this email address already exists.");
  });

  it("exposes validation errors by field and the Retry-After header", async () => {
    const error = await toApiError(
      problemResponse(
        {
          type: "about:blank",
          title: "Too Many Requests",
          status: 429,
          detail: "Too many attempts.",
          code: "rate_limited",
          errors: [{ location: "body.email", message: "value is not a valid email address" }],
        },
        { status: 429, headers: { "Retry-After": "120" } },
      ),
    );

    expect(error.retryAfter).toBe(120);
    expect(error.fieldError("body.email")).toBe("value is not a valid email address");
    expect(error.fieldError("body.name")).toBeUndefined();
  });

  it("does not trust bodies that are not Problem Details", async () => {
    const error = await toApiError(
      new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
    );

    expect(error.code).toBe("unexpected_response");
    expect(error.status).toBe(502);
  });
});
