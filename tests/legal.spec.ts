import { expect, test } from "@playwright/test";

test("legal and safety pages are publicly reachable", async ({ page }) => {
  await page.goto("/legal/privacy");
  await expect(page.getByRole("heading", { name: /Privacy-first by default/i })).toBeVisible();

  await page.goto("/legal/terms");
  await expect(page.getByRole("heading", { name: /Use the platform responsibly/i })).toBeVisible();

  await page.goto("/legal/community");
  await expect(page.getByRole("heading", { name: /Clear plans, public spaces, respectful behavior/i })).toBeVisible();

  await page.goto("/safety/reporting");
  await expect(page.getByRole("heading", { name: /What to do when something feels off/i })).toBeVisible();
});
