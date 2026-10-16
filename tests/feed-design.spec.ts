import { expect, test } from "@playwright/test";

test("feed search and filters keep example plans honest and usable", async ({ page }) => {
  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: "Find your next +1." })).toBeVisible();
  await expect(page.getByText("These are example plans", { exact: false })).toBeVisible();
  const cards = page.locator("article.wl-card");
  await expect(cards).toHaveCount(3);
  await page.getByRole("searchbox", { name: "Search requests" }).fill("library");
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("Weekend library study");
  await page.getByRole("button", { name: "Email-confirmed only", exact: true }).click();
  await expect(cards).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(cards).toHaveCount(3);
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page.getByRole("button", { name: "All", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Coffee Walk", exact: true }).click();
  await expect(cards).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await page.getByRole("button", { name: "Expiring soon", exact: true }).click();
  await expect(cards).toHaveCount(1);
  await expect(cards.getByRole("button", { name: "Sign in to join", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Create Request", exact: true }).click();
  await expect(page).toHaveURL(/\/requests\/new$/);
});

for (const width of [360, 768, 1440]) {
  test(`colourful feed fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/feed");
    await expect(page.getByRole("searchbox", { name: "Search requests" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(248, 249, 255)");
    await expect(page.getByRole("heading", { name: "Meet safely", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/feed-${width}.png`, fullPage: true });
    if (width === 1440) await page.screenshot({ path: "test-results/feed-desktop.png" });
    await page.locator("article.wl-card").first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/feed-cards-${width}.png` });
    const cardOverflow = await page.locator("article.wl-card").first().evaluate((card) =>
      [...card.querySelectorAll("*")].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.right > window.innerWidth + 1 || box.left < -1);
      }).map((element) => element.tagName));
    expect(cardOverflow).toEqual([]);
  });
}
