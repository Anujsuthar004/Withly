import { expect, test } from "@playwright/test";

test("landing page shows the secure marketing surface", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Find someone to go with/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Sign in and keep every plan moving/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reporting" })).toBeVisible();
});
