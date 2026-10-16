import { expect, test } from "@playwright/test";

const sessionPath = "/sessions/d9fd0d36-e844-4133-a0a1-74488992ae98";

test("chat bubbles wrap synthetic long content at narrow widths", async ({ page }, testInfo) => {
  await page.goto(sessionPath);
  // Presentation-only stress test; never writes a real message or database row.
  await page.locator(".wl-bubble").last().evaluate((bubble) => {
    bubble.textContent = "LongUnbrokenMessage".repeat(35);
  });
  for (const width of [320, 360, 768]) {
    await page.setViewportSize({ width, height: 700 });
    const bubble = page.locator(".wl-bubble").last();
    await bubble.scrollIntoViewIfNeeded();
    expect(await bubble.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/chat-long-${testInfo.project.name}-${width}.png` });
  }
});

test("slow and failed chat send retains a long draft and releases busy controls", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 400 });
  await page.goto(sessionPath);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let intercepted = false;
  await page.route(`**${sessionPath}`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    intercepted = true;
    await gate;
    await route.abort("failed");
  });
  const draft = "LongUnbrokenMessage".repeat(35);
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  const send = page.getByRole("button", { name: "Send message", exact: true });
  await input.fill(draft);
  await send.click();
  try {
    await expect.poll(() => intercepted).toBe(true);
    await expect(input).toBeDisabled();
    await expect(send).toBeDisabled();
  } finally { release(); }
  await expect(page.getByText(/Could not confirm your message was sent/)).toBeVisible();
  await expect(input).toHaveValue(draft);
  await expect(input).toBeEnabled();
  await expect(send).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await input.focus();
  await page.keyboard.press("End");
  await page.keyboard.type("!");
  await expect(input).toHaveValue(`${draft}!`);
});

test("network failure during check-in does not imply success", async ({ page }) => {
  await page.goto(sessionPath);
  await page.route(`**${sessionPath}`, (route) => route.request().method() === "POST" ? route.abort("failed") : route.continue());
  const checkIn = page.getByRole("button", { name: "I'm OK", exact: true });
  await checkIn.click();
  await expect(page.getByText("Failed to submit check-in.", { exact: true })).toBeVisible();
  await expect(checkIn).toBeEnabled();
  await expect(checkIn).not.toHaveClass(/active/);
});
