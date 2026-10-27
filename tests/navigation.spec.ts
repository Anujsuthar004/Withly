import { expect, test } from "@playwright/test";

test.describe("navigation and page accessibility", () => {
  test("footer uses clear copy without exposing an email link", async ({ page }) => {
    for (const path of ["/", "/legal/privacy", "/legal/terms", "/legal/community", "/safety/reporting"]) {
      await page.goto(path);
      const footer = page.locator(".site-footer");
      await expect(footer.getByRole("heading")).toHaveText("Good company. Better study sessions and coffee breaks.");
      await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0);
      await expect(footer).not.toContainText("@");
      await expect(footer).not.toContainText("public window");
      await expect(footer.getByRole("link", { name: "Help & reporting" })).toHaveAttribute("href", "/safety/reporting");
    }
  });

  test("failed email callbacks explain how to recover", async ({ page }) => {
    await page.goto("/auth/callback?error=access_denied");
    await expect(page).toHaveURL(/\/auth\/error$/);
    await expect(page.getByRole("heading", { name: "This email link could not be completed." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to sign in" })).toBeVisible();
  });
  for (const unsafe of ["//evil.example", "/\\evil.example", "/\n/evil.example", "/%5cevil.example", "/%255cevil.example", "https://evil.example"]) {
    test(`auth callback rejects ${JSON.stringify(unsafe)}`, async ({ request, baseURL }) => {
      const response = await request.get(`/auth/callback?next=${encodeURIComponent(unsafe)}`, { maxRedirects: 0 });
      expect(response.status()).toBe(307);
      const location = new URL(response.headers().location);
      expect(location.origin).toBe(new URL(baseURL!).origin);
      expect(location.pathname).toBe("/feed");
    });
  }

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

    const reportingLink = page.getByRole("link", { name: "Help & reporting" });
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
    await expect(page.getByText("2-hour deep work & coffee sprint", { exact: true })).toBeVisible();
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
