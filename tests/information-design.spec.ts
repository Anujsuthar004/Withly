import { expect, test } from "@playwright/test";

const pages = [
  { path: "/safety/reporting", name: "safety", title: "What to do when something feels off.", sections: 3 },
  { path: "/legal/privacy", name: "privacy", title: "Privacy-first by default, not by marketing copy.", sections: 5 },
  { path: "/legal/terms", name: "terms", title: "Clear rules for coordinating safely.", sections: 5 },
  { path: "/legal/community", name: "community", title: "Clear plans, public spaces, respectful behavior.", sections: 4 },
];

for (const entry of pages) {
  test(`${entry.name} navigation and support remain accessible`, async ({ page }) => {
    await page.goto(entry.path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry.title);
    await expect(page.getByRole("article")).toHaveCount(entry.sections);
    const menu = page.getByRole("navigation", { name: "On this page" });
    await expect(menu.getByRole("link")).toHaveCount(entry.sections);
    await menu.getByRole("link").last().click();
    await expect(page).toHaveURL(new RegExp(`#section-${entry.sections}$`));
    await expect(page.locator(`#section-${entry.sections}`)).toBeInViewport();
    await page.getByRole("link", { name: "Back to top" }).click();
    await expect(page).toHaveURL(/#page-top$/);
    await expect(page.getByRole("link", { name: "Contact support", exact: true })).toHaveAttribute("href", /^mailto:[^\s]+$/);
    await expect(page.getByRole("navigation", { name: "Footer" }).getByRole("link")).toHaveCount(5);
    if (entry.name === "safety") {
      await expect(page.getByText("Leave the situation if you feel unsafe.", { exact: false })).toBeVisible();
      await expect(page.getByRole("link", { name: "Open your sessions" })).toHaveAttribute("href", "/sessions");
    } else {
      await expect(page.getByRole("link", { name: "Your account controls" })).toHaveAttribute("href", "/account");
    }
    if (["terms", "privacy"].includes(entry.name)) await expect(page.getByText("Effective September 24, 2026.", { exact: false })).toBeVisible();
  });
}

for (const width of [360, 768, 1440]) {
  test(`information pages fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const entry of pages) {
      await page.goto(entry.path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry.title);
      await expect(page.locator("main")).toHaveCSS("width", `${width}px`);
      await expect(page.locator("main")).toHaveCSS("background-color", "rgb(248, 249, 255)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/info-${entry.name}-${width}.png` });
      await page.locator("#section-1").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `test-results/info-${entry.name}-reading-${width}.png` });
      await page.getByRole("navigation", { name: "Footer" }).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
}
