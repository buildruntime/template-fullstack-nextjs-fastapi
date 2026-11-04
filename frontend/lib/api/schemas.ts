import { z } from "zod";

/** API responses, validated where they enter the application. */

export const userSchema = z.object({
  id: z.uuid(),
  email: z.string(),
  name: z.string(),
  role: z.enum(["user", "admin"]),
  is_active: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
  last_login_at: z.iso.datetime({ offset: true }).nullable(),
});

export const userPageSchema = z.object({
  items: z.array(userSchema),
  next_cursor: z.string().nullable(),
});

export const issuedSessionSchema = z.object({
  token: z.string().min(1),
  expires_at: z.iso.datetime({ offset: true }),
  user: userSchema,
});

export const sessionSchema = z.object({
  id: z.uuid(),
  user_agent: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  last_used_at: z.iso.datetime({ offset: true }),
  expires_at: z.iso.datetime({ offset: true }),
  current: z.boolean(),
});

export const readinessSchema = z.object({
  status: z.enum(["ok", "unavailable"]),
  checks: z.record(z.string(), z.enum(["ok", "unavailable", "not_configured"])),
});

export type User = z.infer<typeof userSchema>;
export type UserPage = z.infer<typeof userPageSchema>;
export type IssuedSession = z.infer<typeof issuedSessionSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Readiness = z.infer<typeof readinessSchema>;
