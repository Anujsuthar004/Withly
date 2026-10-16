import { expect, test } from "@playwright/test";

const sessionPath = "/sessions/d9fd0d36-e844-4133-a0a1-74488992ae98";

test("confirmed plan opens its own chat and returns to sessions", async ({ page }) => {
  await page.goto("/sessions");
  await expect(page.getByRole("heading", { name: "It’s a plan. Better with a +1." })).toBeVisible();
  await expect(page.getByText("Preview sessions", { exact: false })).toBeVisible();
  const card = page.getByRole("article", { name: "Session: Passport office morning run" });
  await expect(card).toContainText("Aarav");
  await expect(card).toContainText("BKC");
  await expect(card.getByText("EXAMPLE", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "All requests & history" })).toHaveAttribute("href", "/requests");
  await card.getByRole("link", { name: "Open chat" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(sessionPath);
  await expect(page.getByRole("heading", { name: "Passport office morning run", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "View request", exact: true })).toHaveAttribute("href", "/requests/d9fd0d36-e844-4133-a0a1-74488992ae98");
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "I'm OK", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Safety & reporting" })).toHaveAttribute("href", "/safety/reporting");
  await page.getByRole("link", { name: "All sessions", exact: true }).click();
  await expect(page).toHaveURL(/\/sessions$/);
});

test("unavailable session keeps a clear recovery path", async ({ page }) => {
  await page.goto("/sessions/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { name: "No active session for this request" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Go to inbox" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
});

for (const width of [360, 768, 1440]) {
  test(`sessions and their chat fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/sessions");
    await expect(page.getByRole("heading", { name: "It’s a plan. Better with a +1." })).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(248, 249, 255)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/sessions-${width}.png` });
    await page.getByRole("article").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/sessions-card-${width}.png` });
    await page.getByRole("link", { name: "Open chat", exact: true }).click();
    await expect(page).toHaveURL(sessionPath);
    await expect(page.getByRole("region", { name: "Session chat and controls" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Passport office morning run", exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/session-detail-${width}.png` });
    await page.locator(".wl-chat-card").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/session-chat-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const overflow = await page.locator(".wl-chat-card").evaluate((card) => [...card.querySelectorAll("*")].filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 1 && (box.left < -1 || box.right > window.innerWidth + 1);
    }).map((element) => element.tagName));
    expect(overflow).toEqual([]);
  });
}
