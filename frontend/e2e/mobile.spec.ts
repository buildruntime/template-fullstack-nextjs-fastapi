import { devices, expect, test } from "@playwright/test";
import { expectNoViolations, register } from "./helpers";

// A phone-sized viewport with touch. Pixel 7 uses Chromium, like the other tests.
test.use(devices["Pixel 7"]);

test("on a phone, navigation opens from the menu button", async ({ page }) => {
  await register(page, "Annie Easley");

  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog").getByRole("link", { name: "Settings" }).click();

  await expect(page).toHaveURL("/settings");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expectNoViolations(page);
});
