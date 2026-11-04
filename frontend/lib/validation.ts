import { z } from "zod";

/**
 * Form validation, for fast feedback before the request is sent. The API validates everything
 * again and is the authority: these rules mirror app/users/schemas.py.
 */

const email = z.email("Enter a valid email address.").max(320);
const name = z.string().trim().min(1, "Enter your name.").max(100, "Use 100 characters or fewer.");
const newPassword = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use 128 characters or fewer.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(128),
  next: z.string().optional(),
});

export const registerSchema = z.object({ email, name, password: newPassword });

export const profileSchema = z.object({ name });

export const passwordChangeSchema = z
  .object({
    current_password: z.string().min(1, "Enter your current password.").max(128),
    new_password: newPassword,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    path: ["confirm_password"],
    message: "The passwords do not match.",
  });

export type FieldErrors = Record<string, string | undefined>;

/** The first message for each field, keyed by field name. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const flattened = z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
  return Object.fromEntries(
    Object.entries(flattened).map(([key, messages]) => [key, messages?.[0]]),
  );
}

export function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  return Object.fromEntries(keys.map((key) => [key, String(formData.get(key) ?? "")]));
}
