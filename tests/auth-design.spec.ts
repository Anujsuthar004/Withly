import { expect, test } from "@playwright/test";

test("sign-in and signup preserve mode, password and consent controls", async ({ page }) => {
  await page.goto("/#join");
  const panel = page.getByRole("region", { name: "Good to see you." });
  const modes = page.getByRole("group", { name: "Account access mode" });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Email", { exact: true }).fill("preview@example.com");
  await panel.getByLabel("Password", { exact: true }).fill("local-preview-only");
  await panel.getByRole("button", { name: "Show password" }).click();
  await expect(panel.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  await modes.getByRole("button", { name: "Create Account", exact: true }).click();
  const signup = page.getByRole("region", { name: "Your +1 starts here." });
  await expect(signup.getByLabel("Email", { exact: true })).toHaveValue("preview@example.com");
  await expect(signup.getByLabel("Password", { exact: true })).toHaveValue("");
  await expect(signup.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await expect(signup.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "new-password");
  await expect(signup.getByRole("checkbox")).not.toBeChecked();
  await expect(signup.getByRole("checkbox")).toHaveAttribute("required", "");
  for (const name of ["Terms", "Privacy Policy", "Community Guidelines"]) await expect(signup.getByRole("link", { name, exact: true })).toBeVisible();
  await modes.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(panel.getByLabel("Display name")).toHaveCount(0);
  await expect(panel.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
});

test("local auth unavailable states stay inline without sending email", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/#join");
  const panel = page.getByRole("region", { name: "Good to see you." });
  await panel.getByLabel("Email", { exact: true }).fill("preview@example.com");
  await panel.getByLabel("Password", { exact: true }).fill("local-preview-only");
  await panel.locator("button[type=submit]").click();
  await expect(panel.getByRole("status")).toHaveText("Sign-in is temporarily unavailable right now.");
  await panel.getByRole("button", { name: "Send password reset link" }).click();
  await expect(panel.getByRole("status")).toHaveText("Password reset is temporarily unavailable right now.");
  expect(posts).toEqual([]);
});

test("recovery requires a session and email error offers a way back", async ({ page }) => {
  await page.goto("/auth/reset-password");
  await expect(page.getByRole("heading", { name: "Fresh start. Same you." })).toBeVisible();
  await expect(page.getByLabel("New password", { exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save New Password" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("Open the reset link from your email");
  await page.getByRole("link", { name: "Need a new link? Return to sign in" }).click();
  await expect(page).toHaveURL(/\/#join$/);
  await page.goto("/auth/error");
  await expect(page.getByRole("heading", { name: "This email link could not be completed." })).toBeVisible();
  await page.getByRole("link", { name: "Return to sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/#join$/);
});

for (const width of [360, 768, 1440]) {
  test(`auth screens fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/#join");
    await page.getByRole("region", { name: "Good to see you." }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/auth-signin-${width}.png` });
    await page.getByRole("group", { name: "Account access mode" }).getByRole("button", { name: "Create Account" }).click();
    const signup = page.getByRole("region", { name: "Your +1 starts here." });
    await signup.scrollIntoViewIfNeeded();
    const overflow = await signup.evaluate((section) => [...section.querySelectorAll("input, button, a")].filter((element) => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.left < -1 || box.right > window.innerWidth + 1);
    }).map((element) => element.tagName));
    expect(overflow).toEqual([]);
    await page.screenshot({ path: `test-results/auth-signup-${width}.png` });
    for (const path of ["reset-password", "error"]) {
      await page.goto(`/auth/${path}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main")).toHaveCSS("width", `${width}px`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/auth-${path}-${width}.png`, fullPage: true });
    }
  });
}
