import { expect, test } from "@playwright/test";

test("landing page shows the secure marketing surface", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Company for the moments/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Secure sign-in, real people, private sessions/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Only safe public fields are shown before sign-in/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reporting" })).toBeVisible();
});
