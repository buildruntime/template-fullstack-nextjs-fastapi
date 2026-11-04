import { expect, test } from "@playwright/test";
import { PASSWORD, register, signIn } from "./helpers";

test("a user can change their name", async ({ page }) => {
  await register(page, "Ada");
  await page.goto("/settings");

  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page.getByText("Profile saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace");
});

test("changing the password signs out other sessions", async ({ page, browser }) => {
  const email = await register(page, "Grace Hopper");
  const laptop = await (await browser.newContext()).newPage();
  await signIn(laptop, email);
  await expect(laptop).toHaveURL("/dashboard");

  await page.goto("/settings");
  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByLabel("New password", { exact: true }).fill("an entirely new passphrase");
  await page.getByLabel("Repeat new password").fill("an entirely new passphrase");
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(page.getByRole("status").getByText("1 other session was signed out.")).toBeVisible();
  await laptop.goto("/settings");
  await expect(laptop).toHaveURL(/\/sign-in\?reason=expired/);
  await signIn(laptop, email, "an entirely new passphrase");
  await expect(laptop).toHaveURL("/dashboard");
});

test("a wrong current password is shown next to the field", async ({ page }) => {
  await register(page, "Katherine Johnson");
  await page.goto("/settings");

  await page.getByLabel("Current password").fill("not my password");
  await page.getByLabel("New password", { exact: true }).fill("an entirely new passphrase");
  await page.getByLabel("Repeat new password").fill("an entirely new passphrase");
  await page.getByRole("button", { name: "Change password" }).click();

  await expect(page.getByText("The current password is incorrect.")).toBeVisible();
  await expect(page.getByLabel("Current password")).toHaveAttribute("aria-invalid", "true");
});

test("a user can sign out another device", async ({ page, browser }) => {
  const email = await register(page, "Mary Jackson");
  const phone = await (await browser.newContext()).newPage();
  await signIn(phone, email);
  await expect(phone).toHaveURL("/dashboard");

  await page.goto("/settings");
  const sessions = page.locator("#sessions li");
  await expect(sessions).toHaveCount(2);
  await sessions.getByRole("button", { name: /^Sign out/ }).click();

  await expect(page.getByText("Session signed out.")).toBeVisible();
  await expect(sessions).toHaveCount(1);
  await expect(sessions.getByText("This device")).toBeVisible();
  await phone.goto("/dashboard");
  await expect(phone).toHaveURL(/\/sign-in\?reason=expired/);
});
