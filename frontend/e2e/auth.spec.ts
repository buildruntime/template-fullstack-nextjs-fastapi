import { expect, test } from "@playwright/test";
import { PASSWORD, register, signIn, signOut, uniqueEmail } from "./helpers";

test("a new user can register, sign out and sign in again", async ({ page }) => {
  const email = await register(page, "Ada Lovelace");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Ada");
  await expect(page.getByRole("main").getByText(email)).toBeVisible();
  await expect(page.getByText("Operational").first()).toBeVisible();

  await signOut(page);
  await expect(page.getByText("You have been signed out.")).toBeVisible();

  await signIn(page, email);
  await expect(page).toHaveURL("/dashboard");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back, Ada");
});

test("the session cookie is HttpOnly and not readable from the page", async ({ page, context }) => {
  await register(page, "Grace Hopper");

  const cookie = (await context.cookies()).find((c) => c.name.endsWith("session"));
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("session");
});

test("protected pages redirect to sign-in and come back afterwards", async ({ page }) => {
  const email = await register(page, "Katherine Johnson");
  await signOut(page);

  await page.goto("/settings");
  await expect(page).toHaveURL("/sign-in?next=%2Fsettings");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/settings");
});

test("sign-in does not redirect to other sites", async ({ page }) => {
  const email = await register(page, "Hedy Lamarr");
  await signOut(page);

  await page.goto("/sign-in?next=//evil.example/phish");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL("/dashboard");
});

test("registration explains invalid input and keeps what was typed", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Mary Jackson");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 12 characters.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Name")).toHaveValue("Mary Jackson");
});

test("an email address can only be registered once", async ({ page, browser }) => {
  const email = await register(page, "Dorothy Vaughan");

  const other = await (await browser.newContext()).newPage();
  await other.goto("/register");
  await other.getByLabel("Name").fill("Someone else");
  await other.getByLabel("Email").fill(email.toUpperCase());
  await other.getByLabel("Password").fill(PASSWORD);
  await other.getByRole("button", { name: "Create account" }).click();

  await expect(
    other
      .getByRole("alert")
      .filter({ hasText: "An account with this email address already exists." }),
  ).toBeVisible();
});

test("a wrong password and an unknown email give the same answer", async ({ page }) => {
  const email = await register(page, "Annie Easley");
  await signOut(page);

  await signIn(page, email, "not the password");
  await expect(
    page.getByRole("alert").filter({ hasText: "The email address or password is incorrect." }),
  ).toBeVisible();

  await signIn(page, uniqueEmail("nobody"), PASSWORD);
  await expect(
    page.getByRole("alert").filter({ hasText: "The email address or password is incorrect." }),
  ).toBeVisible();
});
