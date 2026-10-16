import { expect, test } from "@playwright/test";

test("keyboard skip link moves focus past navigation", async ({ page }) => {
  for (const route of ["/", "/feed", "/account", "/explore", "/auth/reset-password", "/safety/reporting", "/unknown-audit-page"]) {
    await page.goto(route);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  }
});

test("request filters and signup switch work from keyboard", async ({ page }) => {
  await page.goto("/requests");
  const completed = page.getByRole("button", { name: "Completed", exact: true });
  await completed.focus();
  await page.keyboard.press("Space");
  await expect(completed).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "No completed requests yet." })).toBeVisible();
  await page.goto("/#join");
  const create = page.getByRole("group", { name: "Account access mode" }).getByRole("button", { name: "Create Account" });
  await create.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your +1 starts here." })).toBeVisible();
});

for (const viewport of [{ width: 320, height: 900 }, { width: 667, height: 375 }]) {
  test(`narrow and landscape reflow ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/feed", "/requests/new", "/inbox", "/sessions", "/profile", "/account", "/alerts", "/explore", "/safety/reporting", "/auth/reset-password", "/unknown-audit-page"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true);
    }
  });
}

test("public explore and 404 preserve navigation", async ({ page }) => {
  await page.goto("/explore");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: "test-results/polish-explore.png", fullPage: true, animations: "disabled" });
  await page.getByRole("link", { name: "2-hour deep work & coffee sprint", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("2-hour deep work & coffee sprint");
  await page.getByRole("link", { name: "Sign in to request to join" }).click();
  await expect(page).toHaveURL(/\?next=.*#join$/);
  await page.goto("/unknown-audit-page");
  await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();
  await page.screenshot({ path: "test-results/polish-404.png", animations: "disabled" });
  await page.getByRole("link", { name: "Browse requests" }).click();
  await expect(page).toHaveURL(/\/explore$/);
});
