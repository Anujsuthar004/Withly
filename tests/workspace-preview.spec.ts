import { expect, test } from "@playwright/test";

test("workspace renders safe preview mode when Supabase env is absent", async ({ page }) => {
  await page.goto("/workspace");

  await expect(page.getByRole("heading", { name: /Your plans, replies, and next steps in one place/i })).toBeVisible();
  await expect(page.getByText(/Preview mode is active/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Your requests, matches, and follow-up controls/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Account/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview mode only" }).first()).toBeDisabled();
});
