import { expect, test } from "@playwright/test";

test("public explore is reachable and legacy workspace redirects", async ({ page }) => {
  await page.goto("/workspace");
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole("heading", { name: /Browse open requests before you sign in/i })).toBeVisible();

  const firstRequest = page.locator(".request-card a").first();
  await expect(firstRequest).toBeVisible();
  await firstRequest.click();
  await expect(page).toHaveURL(/\/explore\/requests\/[0-9a-f-]+$/);

  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: /Browse requests and open the ones you can support/i })).toBeVisible();
});
