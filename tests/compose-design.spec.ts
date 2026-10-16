import { expect, test } from "@playwright/test";

test("composer presets, editable preview and keyboard switches do not publish", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/requests/new");
  const preview = page.getByRole("complementary", { name: "Your request preview" });
  await expect(page.getByRole("heading", { name: "Your plan. Room for a +1." })).toBeVisible();
  await page.getByRole("button", { name: "Deep Work Sprint", exact: true }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("2-hour deep work & coffee sprint");
  await expect(page.getByRole("button", { name: "Deep Work Sprint", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(preview.getByRole("heading", { name: "2-hour deep work & coffee sprint" })).toBeVisible();
  await page.getByLabel("Area / Neighborhood", { exact: true }).fill("Central Library");
  await expect(preview.getByText("Central Library", { exact: true })).toBeVisible();
  await expect(preview.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "4");
  await page.getByLabel("Tags", { exact: true }).fill("");
  await expect(preview.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3");
  const emailSwitch = page.getByRole("switch", { name: "Email-confirmed members only", exact: true });
  await expect(emailSwitch).toBeChecked();
  await emailSwitch.focus();
  await page.keyboard.press("Space");
  await expect(emailSwitch).not.toBeChecked();
  await expect(preview.getByText("Email-confirmed replies", { exact: true })).toHaveCount(0);
  const expirySwitch = page.getByRole("switch", { name: "Close after six hours", exact: true });
  await expirySwitch.focus();
  await page.keyboard.press("Space");
  await expect(expirySwitch).toBeChecked();
  await expect(preview.getByText("Closes 6h after posting", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Coffee Walk & Stroll", exact: true }).click();
  await expect(page.getByRole("group", { name: "Request activity" }).getByRole("button", { name: "Coffee Walk", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Afternoon coffee run & stroll");
  await expect(page.getByLabel("Area / Neighborhood", { exact: true })).toHaveValue("Central Library");
  await expect(page.getByRole("button", { name: "Preview mode only", exact: true })).toBeDisabled();
  await page.getByLabel("Title", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/requests\/new$/);
  expect(posts).toEqual([]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL(/\/feed$/);
});

for (const width of [360, 768, 1440]) {
  test(`composer layout and preview remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/requests/new");
    await page.getByRole("button", { name: "Deep Work Sprint", exact: true }).click();
    await expect(page.getByRole("complementary", { name: "Your request preview" })).toBeVisible();
    await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(248, 249, 255)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/compose-${width}.png` });
    await page.getByRole("switch", { name: "Close after six hours", exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/compose-settings-${width}.png` });
    await page.getByRole("complementary", { name: "Your request preview" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/compose-preview-${width}.png` });
    const overflow = await page.getByRole("complementary", { name: "Your request preview" }).evaluate((aside) =>
      [...aside.querySelectorAll("*")].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 1 && (box.right > window.innerWidth + 1 || box.left < -1);
      }).map((element) => element.tagName));
    expect(overflow).toEqual([]);
  });
}
