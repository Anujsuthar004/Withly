import { expect, test } from "@playwright/test";

test.describe("navigation and page accessibility", () => {
  test("landing page has working footer links", async ({ page }) => {
    await page.goto("/");

    const privacyLink = page.getByRole("link", { name: "Privacy" });
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();
    await expect(page).toHaveURL(/\/legal\/privacy$/);
    await expect(page.getByRole("heading", { name: /Privacy/i })).toBeVisible();
  });

  test("landing page has working reporting link", async ({ page }) => {
    await page.goto("/");

    const reportingLink = page.getByRole("link", { name: "Reporting" });
    await expect(reportingLink).toBeVisible();
    await reportingLink.click();
    await expect(page).toHaveURL(/\/safety\/reporting$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("explore page is publicly accessible", async ({ page }) => {
    await page.goto("/explore");
    // The explore page may use an h2 heading in preview mode
    await expect(page.locator("h1, h2").first()).toBeVisible();
    expect(page.url()).toContain("/explore");
  });

  test("unknown routes do not crash the app", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist");
    expect(response).toBeTruthy();
    // Next.js should return a 404 page, not a 500 error
    expect(response!.status()).toBeLessThan(500);
  });

  test("legal pages have consistent shell structure", async ({ page }) => {
    for (const path of ["/legal/privacy", "/legal/terms", "/legal/community"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // Each legal page should have links
      const links = page.getByRole("link");
      expect(await links.count()).toBeGreaterThan(0);
    }
  });
});
