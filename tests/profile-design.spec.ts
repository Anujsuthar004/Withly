import { expect, test } from "@playwright/test";

test("profile checklist, editor and preview safeguards", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "A little more you." })).toBeVisible();
  await expect(page.getByText("Example profile", { exact: false })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Profile details completed" })).toHaveAttribute("aria-valuenow", "3");
  await expect(page.getByText("Trust scores and email confirmation are not identity or safety guarantees.")).toBeVisible();
  const edit = page.getByRole("button", { name: "Edit profile", exact: true });
  await expect(edit).toHaveAttribute("aria-expanded", "false");
  await edit.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Cancel editing" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "Make yourself at home." })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "About you", exact: true })).toBeDisabled();
  for (const name of ["Display name", "Home area", "Profile photo", "Availability day", "Availability start time", "Availability end time", "Availability label"]) {
    await expect(page.getByLabel(name, { exact: true })).toBeDisabled();
  }
  await expect(page.getByRole("button", { name: "Change photo" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Preview mode only" })).toHaveCount(2);
  await page.getByRole("button", { name: "Cancel editing" }).click();
  await expect(page.getByRole("heading", { name: "Make yourself at home." })).toHaveCount(0);
  await expect(edit).toHaveAttribute("aria-expanded", "false");
  expect(posts).toEqual([]);
  await expect(page.getByRole("heading", { name: "Your familiar faces." })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Account settings", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
});

for (const width of [360, 768, 1440]) {
  test(`profile layout and editor fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/profile");
    await expect(page.getByRole("heading", { name: "A little more you." })).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(248, 249, 255)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/profile-${width}.png` });
    await page.getByRole("heading", { name: "Make a little time." }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/profile-availability-${width}.png` });
    await page.getByRole("button", { name: "Edit profile", exact: true }).click();
    await page.getByRole("region", { name: "Make yourself at home." }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/profile-editor-${width}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const overflow = await page.locator(".wl-profile-edit-card").evaluate((card) => [...card.querySelectorAll("input:not([type=file]), textarea, button")].filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 1 && (box.left < -1 || box.right > window.innerWidth + 1);
    }).map((element) => element.tagName));
    expect(overflow).toEqual([]);
  });
}
