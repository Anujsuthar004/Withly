import { expect, test } from "@playwright/test";

test("admin preview preserves safeguards and keyboard-operable filters", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A safer community.");
  await expect(page.getByText(/All records are fictional and moderation actions are disabled/)).toBeVisible();
  const reports = page.getByRole("region", { name: "Reports queue", exact: true });
  await expect(reports.getByRole("heading", { name: "Repeated unwanted messages" })).toBeVisible();
  await expect(reports.getByRole("button", { name: "Dismiss", exact: true })).toBeDisabled();
  await expect(reports.getByLabel("Resolution note")).toBeDisabled();
  const filters = page.getByRole("group", { name: "Report status filters" });
  const resolved = filters.getByRole("button", { name: "Resolved", exact: true });
  await resolved.focus();
  await page.keyboard.press("Enter");
  await expect(resolved).toHaveAttribute("aria-pressed", "true");
  await expect(filters.getByRole("button", { name: "Active", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(reports.getByRole("heading", { name: "Example resolved report" })).toBeVisible();
  await page.getByLabel("Search reports").fill("no-matching-report");
  await expect(reports.getByText("No reports match this view right now.")).toBeVisible();
  const members = page.getByRole("region", { name: "Members", exact: true });
  await members.getByRole("button", { name: "Admins", exact: true }).click();
  await expect(members.getByRole("heading", { name: "Example moderator" })).toBeVisible();
  await expect(members.getByRole("heading", { name: "Example member" })).toHaveCount(0);
  await page.getByLabel("Search members").fill("missing-person");
  await expect(members.getByText("No members match this view.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel request", exact: true })).toBeDisabled();
  expect(posts).toEqual([]);
});

for (const width of [320, 360, 768, 1440]) {
  test(`admin layout and long report content fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const details = page.locator("#reports .review-about").first();
    await expect(details).toContainText("LongUnbrokenText");
    expect(await details.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/admin-${testInfo.project.name}-${width}.png`, fullPage: true });
  });
}
