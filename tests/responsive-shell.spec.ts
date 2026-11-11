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

for (const viewport of [{ width: 320, height: 700 }, { width: 390, height: 844 }, { width: 667, height: 375 }]) {
  test(`secondary destinations remain reachable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/feed");
    const more = page.getByRole("button", { name: "More navigation" });
    const destinations = page.getByRole("navigation", { name: "More destinations" });
    await more.focus();
    await page.keyboard.press("Enter");
    await expect(destinations).toBeVisible();
    await expect(destinations.getByRole("link", { name: "Admin", exact: true })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(destinations).toBeHidden();
    await expect(more).toBeFocused();
    for (const [label, path] of [["Sessions", "/sessions"], ["My requests", "/requests"], ["Account settings", "/account"]]) {
      await more.click();
      const link = destinations.getByRole("link", { name: label, exact: true });
      await expect(link).toBeInViewport();
      await link.click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(destinations).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
    await more.click();
    await page.getByRole("heading", { level: 1 }).click();
    await expect(destinations).toBeHidden();
    const settings = page.getByRole("banner").getByRole("link", { name: "Account settings" });
    const target = await settings.boundingBox();
    expect(target?.width).toBeGreaterThanOrEqual(44);
    expect(target?.height).toBeGreaterThanOrEqual(44);
    await more.click();
    await page.screenshot({ path: `test-results/more-navigation-${viewport.width}.png` });
  });
}

test("short desktop sidebar keeps its last destination reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto("/feed");
  const sidebar = page.getByRole("complementary", { name: "Primary", exact: true });
  await sidebar.getByRole("link", { name: "My requests", exact: true }).click();
  await expect(page).toHaveURL(/\/requests$/);
  await sidebar.getByRole("button", { name: "Sign Out" }).click({ trial: true });
  await page.getByRole("link", { name: "Account settings", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
});
