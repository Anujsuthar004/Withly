import { expect, test } from "@playwright/test";

for (const width of [390, 768, 1024]) {
  test(`mobile/tablet navigation remains usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/feed");
    await expect(page.getByRole("complementary", { name: "Primary", exact: true })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Primary (mobile)", exact: true })).toBeVisible();
    const logout = page.getByRole("banner").getByRole("button", { name: "Sign Out", exact: true });
    await expect(logout).toBeVisible();
    await logout.click({ trial: true }); // Verify no fixed navigation intercepts it.
    await page.getByRole("link", { name: "Account settings", exact: true }).click();
    await expect(page).toHaveURL(/\/account$/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
