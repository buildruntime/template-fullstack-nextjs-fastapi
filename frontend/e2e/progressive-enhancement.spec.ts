import { expect, test } from "@playwright/test";
import { PASSWORD, uniqueEmail } from "./helpers";

// Forms submit to Server Actions, which also work as plain HTML form posts. This covers users
// who submit before the page has hydrated. (Pages themselves stream content behind <Suspense>,
// which React reveals with JavaScript, so browsing without JavaScript is not supported.)
test.use({ javaScriptEnabled: false });

test("forms work before JavaScript loads", async ({ page, context }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(uniqueEmail("nojs"));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("The email address or password is incorrect.")).toBeVisible();

  await page.goto("/register");
  await page.getByLabel("Name").fill("No Script");
  await page.getByLabel("Email").fill(uniqueEmail("nojs"));
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL("/dashboard?welcome=1");
  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name.endsWith("session"))?.value).toBeTruthy();
});
