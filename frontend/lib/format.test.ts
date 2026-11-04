import { describe, expect, it } from "vitest";
import { describeUserAgent, formatDateTime, initials } from "./format";

describe("describeUserAgent", () => {
  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
      "Safari on macOS",
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
      "Edge on Windows",
    ],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0", "Firefox on Linux"],
    [
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
      "Chrome on Android",
    ],
    ["curl/8.5.0", "curl"],
    [null, "Unknown device"],
  ])("describes %s", (userAgent, expected) => {
    expect(describeUserAgent(userAgent)).toBe(expected);
  });
});

describe("formatDateTime", () => {
  it("formats in UTC and says so", () => {
    expect(formatDateTime("2026-03-12T09:41:07Z")).toBe("12 Mar 2026, 09:41 UTC");
  });

  it("says never for a missing time", () => {
    expect(formatDateTime(null)).toBe("Never");
  });
});

describe("initials", () => {
  it.each([
    ["Ada Lovelace", "AL"],
    ["Grace Brewster Murray Hopper", "GH"],
    ["ada", "A"],
    ["  ", "?"],
  ])("%s → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
