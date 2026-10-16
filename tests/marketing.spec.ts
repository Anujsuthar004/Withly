import { expect, test } from "@playwright/test";

test("landing page shows the secure marketing surface", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Your everyday. With a \+1./i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Good to see you." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Reporting" })).toBeVisible();
});

test("landing navigation and signup controls remain usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Find your next session" }).click();
  await expect(page).toHaveURL(/#open-requests$/);
  await expect(page.getByText("Example sessions", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Let’s go" }).click();
  await expect(page).toHaveURL(/#join$/);
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByLabel("Display name")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /at least 18/ })).toBeVisible();
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send password reset link" })).toBeVisible();
});

test("activity preview switches locally without creating a session", async ({ page }) => {
  await page.goto("/");
  const chooser = page.getByRole("group", { name: "Preview an activity" });
  await chooser.getByRole("button", { name: "Coffee", exact: true }).click();
  await expect(page.getByRole("heading", { name: "A coffee break, with company." })).toBeVisible();
  await expect(chooser.getByRole("button", { name: "Coffee", exact: true })).toHaveAttribute("aria-pressed", "true");
  await chooser.getByRole("button", { name: "Study", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your own chapter. A shared pause." })).toBeVisible();
  await chooser.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Different goals. Same table." })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

for (const width of [360, 768, 1440]) {
  test(`playful landing fits at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.locator("main").evaluate((main) =>
      [...main.querySelectorAll("*")].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.right > window.innerWidth + 1 || box.left < -1);
      }).map((element) => element.tagName));
    expect(overflow).toEqual([]);
    await page.screenshot({ path: `test-results/landing-${width}.png`, fullPage: true });
    if (width === 1440) await page.screenshot({ path: "test-results/landing-desktop-hero.png" });
  });
}
