import { expect, test } from "@playwright/test";

test("inbox navigation and read-only sample actions", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/inbox");
  await expect(page.getByRole("heading", { name: "A little hello. A possible +1." })).toBeVisible();
  await expect(page.getByText("Preview inbox", { exact: false })).toBeVisible();
  const intro = page.getByRole("article", { name: "Introduction from Mira" });
  await expect(intro.getByText("Example reply")).toBeVisible();
  await expect(intro.getByRole("button", { name: "Accept & open chat" })).toBeDisabled();
  await expect(intro.getByRole("button", { name: "Decline", exact: true })).toBeDisabled();
  await expect(page.locator(".wl-active-dot")).toHaveCount(0);
  const sections = page.getByRole("navigation", { name: "Inbox sections" });
  await sections.getByRole("link", { name: /1 introduction/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#join-review$/);
  await sections.getByRole("link", { name: /Your current chat/ }).click();
  await expect(page).toHaveURL(/#active-session$/);
  await expect(page.getByRole("group", { name: "Sample session (read only)" })).toBeVisible();
  for (const name of ["Send message", "I'm OK", "Missed check-in", "SOS", "Save session feedback", "Submit report", "Block companion"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
  }
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toBeDisabled();
  expect(posts).toEqual([]);
  await expect(page.getByRole("link", { name: "Safety & reporting" })).toHaveAttribute("href", "/safety/reporting");
  await page.getByRole("link", { name: /Another idea in mind/ }).click();
  await expect(page).toHaveURL(/\/requests\/new$/);
});

for (const width of [360, 768, 1440]) {
  test(`inbox cards and chat fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/inbox");
    await expect(page.getByRole("heading", { name: "A little hello. A possible +1." })).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(248, 249, 255)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/inbox-${width}.png` });
    await page.getByRole("article", { name: "Introduction from Mira" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/inbox-replies-${width}.png` });
    await page.locator(".wl-chat-card").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/inbox-chat-${width}.png` });
    for (const selector of [".wl-join-card", ".wl-chat-card"]) {
      const overflow = await page.locator(selector).evaluate((card) => [...card.querySelectorAll("*")].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 1 && (box.left < -1 || box.right > window.innerWidth + 1);
      }).map((element) => element.tagName));
      expect(overflow).toEqual([]);
    }
  });
}
