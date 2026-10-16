import { expect, test } from "@playwright/test";

test("shared-seat mark replaces circle logos and has a visible standalone icon", async ({ page, request }) => {
  for (const path of ["/withly-logo.svg", "/withly-mark.svg", "/withly-app-icon.svg"]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    const svg = await response.text();
    expect(svg).toContain('viewBox="0 0 64 64"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).not.toContain("<circle");
  }
  const manifest = await (await request.get("/manifest.json")).json();
  expect(manifest.icons[0].src).toBe("/withly-app-icon.svg?v=3");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Withly home", exact: true })).toBeVisible();
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/withly-app-icon.svg?v=3");
  await page.setViewportSize({ width: 1200, height: 820 });
  await page.goto("/withly-brand-concept.svg");
  await expect(page.locator("svg")).toBeVisible();
  await page.screenshot({ path: "test-results/withly-shared-seat-concept.png" });
});
