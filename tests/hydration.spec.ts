import { expect, test } from "@playwright/test";

for (const locale of ["en-US", "en-GB", "fr-FR"]) {
  test.describe(`hydration with ${locale} and a different timezone`, () => {
    test.use({ locale, timezoneId: "America/Los_Angeles" });
    test("dates hydrate without replacing the page or losing typed input", async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      for (const route of ["/feed", "/requests", "/inbox", "/requests/d9fd0d36-e844-4133-a0a1-74488992ae98", "/sessions/d9fd0d36-e844-4133-a0a1-74488992ae98"]) {
        await page.goto(route);
        // A relative time changing from the stable SSR fallback proves client hydration.
        await expect(page.locator("time").first()).not.toContainText("UTC");
        if (route === "/feed") {
          await page.getByRole("searchbox", { name: "Search requests" }).fill("library");
          await expect(page.locator("article.wl-card")).toHaveCount(1);
        }
        if (route.startsWith("/sessions/")) {
          const input = page.getByRole("textbox", { name: "Message", exact: true });
          await input.fill("Keep this draft");
          await page.getByLabel("Reason", { exact: true }).fill("Retain this report");
          await expect(input).toHaveValue("Keep this draft");
          await expect(page.getByLabel("Reason", { exact: true })).toHaveValue("Retain this report");
        }
      }
      expect(errors).toEqual([]);
    });
  });
}
