import { expect, test } from "@playwright/test";

test("account shortcuts preserve controls and preview safeguards", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: "Make yourself comfortable." })).toBeVisible();
  await expect(page.getByText("Preview account", { exact: false })).toBeVisible();
  const controls = page.getByRole("region", { name: "Account controls", exact: true });
  for (const label of ["Contact Name *", "Phone Number *", "Email Address (Optional)", "Join with a Community ID", "Create Community", "Why are you leaving?", "Type DELETE MY ACCOUNT to confirm"]) {
    await expect(controls.getByLabel(label, { exact: true })).toBeDisabled();
  }
  for (const button of await controls.getByRole("button").all()) await expect(button).toBeDisabled();
  const download = controls.locator("a[aria-disabled=true]");
  await expect(download).not.toHaveAttribute("href");
  await page.getByRole("link", { name: "Trusted contact", exact: true }).click();
  await expect(page).toHaveURL(/#emergency-contact$/);
  await expect(page.getByText("Withly does not currently send SMS", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Close account", exact: true }).click();
  await expect(page).toHaveURL(/#account-deletion$/);
  await expect(page.getByRole("heading", { name: "Delete your account", exact: true })).toBeVisible();
  expect(posts).toEqual([]);
});

test("notification preview is honest and provides navigation", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/alerts");
  await expect(page.getByRole("heading", { name: "Stay in the loop." })).toBeVisible();
  await expect(page.getByText("Preview notifications", { exact: false })).toBeVisible();
  await expect(page.getByText("No updates yet", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A quiet moment." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore the feed" })).toHaveAttribute("href", "/feed");
  await page.getByRole("link", { name: "Open your inbox" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
  expect(posts).toEqual([]);
});

for (const width of [360, 768, 1440]) {
  test(`account and notification layouts fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Make yourself comfortable." })).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(248, 249, 255)");
    await page.screenshot({ path: `test-results/account-${width}.png` });
    for (const id of ["account-export", "emergency-contact", "trust-communities", "account-deletion"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const overflow = await page.locator(`#${id}`).evaluate((section) => [...section.querySelectorAll("input, textarea, button")].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 1 && (box.left < -1 || box.right > window.innerWidth + 1);
      }).map((element) => element.tagName));
      expect(overflow).toEqual([]);
      await page.screenshot({ path: `test-results/${id}-${width}.png` });
    }
    await page.goto("/alerts");
    await expect(page.getByRole("heading", { name: "Stay in the loop." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/alerts-${width}.png` });
  });
}
