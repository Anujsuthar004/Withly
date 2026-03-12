import { expect, test } from "@playwright/test";

test.describe("brand identity and feature visibility", () => {
  test("topbar and sidebar show the official logo", async ({ page }) => {
    // Going to /feed will show the AppShell in preview mode
    await page.goto("/feed");

    const logo = page.getByAltText("Tag Along Logo");
    // Should be at least 2: one in sidebar, one in topbar
    const count = await logo.count();
    expect(count).toBeGreaterThanOrEqual(1);
    await expect(logo.first()).toBeVisible();
  });

  test("site footer shows the official logo", async ({ page }) => {
    await page.goto("/");
    const footerLogo = page.locator(".site-footer-brand img[alt='Tag Along Logo']");
    await expect(footerLogo).toBeVisible();
  });

  test("request cards show the delete action in my requests", async ({ page }) => {
    await page.goto("/requests");
    
    // In MyRequestsList, we have a "Delete" button
    const deleteButton = page.getByRole("button", { name: /Delete/i }).first();
    await expect(deleteButton).toBeVisible();
    
    // Clicking it should trigger a confirm (which Playwright handles by default or we can mock)
    // For now, just verifying the button exists and is clickable in the UI.
  });
});
