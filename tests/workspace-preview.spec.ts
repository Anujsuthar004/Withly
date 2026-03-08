import { expect, test } from "@playwright/test";

test("workspace renders safe preview mode when Supabase env is absent", async ({ page }) => {
  await page.goto("/workspace");

  await expect(page.getByRole("heading", { name: /Trust-first companionship/i })).toBeVisible();
  await expect(page.getByText(/Preview mode is active/i)).toBeVisible();
  await expect(page.getByText("Your Requests")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Account/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preview mode only" }).first()).toBeDisabled();
});
