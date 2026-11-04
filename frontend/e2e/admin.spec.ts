import { expect, type Page, test } from "@playwright/test";
import { adminCredentials, PASSWORD, register, signIn, uniqueEmail } from "./helpers";

async function signInAsAdmin(page: Page) {
  const { email, password } = adminCredentials();
  await signIn(page, email, password);
  await expect(page).toHaveURL("/dashboard");
}

function rowFor(page: Page, email: string) {
  return page.getByRole("row").filter({ hasText: email });
}

test("users do not see or reach the admin area", async ({ page }) => {
  await register(page, "Ada Lovelace");

  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Users" }),
  ).toHaveCount(0);

  await page.goto("/admin/users");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page does not exist.");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("an admin can find a user and change their role", async ({ page, browser }) => {
  const userPage = await (await browser.newContext()).newPage();
  const email = await register(userPage, "Grace Hopper", uniqueEmail("grace"));

  await signInAsAdmin(page);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Users" }).click();
  await page.getByLabel("Search by name or email").fill(email);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByRole("row")).toHaveCount(2); // Header and one match.

  await rowFor(page, email).getByRole("button", { name: "Actions for Grace Hopper" }).click();
  await page.getByRole("menuitem", { name: "Make admin" }).click();
  await expect(page.getByText("Grace Hopper: Role changed to admin.")).toBeVisible();
  await expect(rowFor(page, email).getByText("admin", { exact: true })).toBeVisible();

  await userPage.reload();
  await expect(
    userPage.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Users" }),
  ).toBeVisible();
});

test("deactivating a user signs them out and blocks sign-in", async ({ page, browser }) => {
  const userPage = await (await browser.newContext()).newPage();
  const email = await register(userPage, "Hedy Lamarr", uniqueEmail("hedy"));

  await signInAsAdmin(page);
  await page.goto(`/admin/users?search=${encodeURIComponent(email)}`);
  await rowFor(page, email).getByRole("button", { name: "Actions for Hedy Lamarr" }).click();
  await page.getByRole("menuitem", { name: "Deactivate account" }).click();
  await expect(
    page.getByText("Hedy Lamarr: Account deactivated and signed out everywhere."),
  ).toBeVisible();
  await expect(rowFor(page, email)).toContainText("Deactivated");

  await userPage.goto("/settings");
  await expect(userPage).toHaveURL(/\/sign-in\?reason=expired/);
  await signIn(userPage, email, PASSWORD);
  await expect(
    userPage
      .getByRole("alert")
      .filter({ hasText: "This account has been deactivated. Contact an administrator." }),
  ).toBeVisible();
});

test("an admin cannot change their own account from the list", async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/admin/users?search=${encodeURIComponent(adminCredentials().email)}`);

  const ownRow = page.getByRole("row").filter({ hasText: "(you)" });
  await expect(ownRow).toBeVisible();
  await expect(ownRow.getByRole("button")).toHaveCount(0);
});
