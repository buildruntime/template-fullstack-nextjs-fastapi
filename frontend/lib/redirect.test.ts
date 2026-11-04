import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each([
    ["/settings", "/settings"],
    ["/admin/users?search=ada", "/admin/users?search=ada"],
    ["/settings#sessions", "/settings#sessions"],
  ])("keeps the same-origin path %s", (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });

  it.each([
    ["https://evil.example/phish"],
    ["//evil.example/phish"],
    ["/\\evil.example"],
    ["javascript:alert(1)"],
    ["settings"],
    [""],
    ["/sign-in"],
    ["/register?x=1"],
    [undefined],
    [42],
    [`/${"a".repeat(600)}`],
  ])("falls back for %s", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });
});
