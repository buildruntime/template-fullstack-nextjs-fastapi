import { expect, test } from "@playwright/test";
import { adminCredentials, expectNoViolations, signIn } from "./helpers";

for (const path of ["/", "/sign-in", "/register"]) {
  test(`${path} has no detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page);
  });
}

for (const theme of ["light", "dark"] as const) {
  test(`signed-in pages have no detectable violations in the ${theme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    const { email, password } = adminCredentials();
    await signIn(page, email, password);
    for (const path of ["/dashboard", "/settings", "/admin/users"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoViolations(page);
    }
  });
}
