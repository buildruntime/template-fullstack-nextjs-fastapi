import { describe, expect, it } from "vitest";
import { fieldErrors, passwordChangeSchema, registerSchema } from "./validation";

describe("registerSchema", () => {
  it("accepts a valid registration and trims the name", () => {
    const result = registerSchema.parse({
      email: "ada@example.com",
      name: "  Ada Lovelace ",
      password: "correct horse battery",
    });

    expect(result.name).toBe("Ada Lovelace");
  });

  it("reports every invalid field once, by name", () => {
    const result = registerSchema.safeParse({
      email: "not-an-email",
      name: " ",
      password: "short",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      email: "Enter a valid email address.",
      name: "Enter your name.",
      password: "Use at least 12 characters.",
    });
  });

  it("matches the API's password limits", () => {
    const base = { email: "ada@example.com", name: "Ada" };
    expect(registerSchema.safeParse({ ...base, password: "a".repeat(12) }).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: "a".repeat(129) }).success).toBe(false);
  });
});

describe("passwordChangeSchema", () => {
  it("requires the confirmation to match", () => {
    const result = passwordChangeSchema.safeParse({
      current_password: "old password",
      new_password: "a new passphrase",
      confirm_password: "a different one",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error).confirm_password).toBe("The passwords do not match.");
  });
});
