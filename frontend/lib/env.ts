import "server-only";
import { z } from "zod";

const schema = z.object({
  // Where the Next.js server reaches the FastAPI backend. Never exposed to the browser.
  API_URL: z.url(),
  // "false" only when serving over plain HTTP on a host other than localhost.
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated server environment. Read lazily, because `next build` imports server modules too. */
export function env(): Env {
  cached ??= schema.parse(process.env);
  return cached;
}
