import { expect, test } from "@playwright/test";

const openId = "0e6ae108-0c8b-4740-b931-dba69f96455c";
const matchedId = "d9fd0d36-e844-4133-a0a1-74488992ae98";
const publicId = "8af9710e-0cb1-419a-85ce-a90dc5fcdf20";

test("request filters, empty state and preview safeguards", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => { if (request.method() === "POST") posts.push(request.url()); });
  await page.goto("/requests");
  const list = page.getByRole("region", { name: "Your requests", exact: true });
  await expect(list.getByRole("article")).toHaveCount(2);
  await expect(list.getByRole("button", { name: "Delete", exact: true })).toBeDisabled();
  await expect(list.getByRole("button", { name: "Delete chat", exact: true })).toBeDisabled();
  await list.getByRole("button", { name: "Open", exact: true }).click();
  await expect(list.getByRole("article")).toHaveCount(1);
  await expect(list.getByRole("button", { name: "Open", exact: true })).toHaveAttribute("aria-pressed", "true");
  await list.getByRole("button", { name: "Completed", exact: true }).click();
  await expect(list.getByRole("heading", { name: "No completed requests yet." })).toBeVisible();
  await list.getByRole("button", { name: "Show all requests" }).click();
  await expect(list.getByRole("article")).toHaveCount(2);
  await list.getByRole("button", { name: "Matched", exact: true }).click();
  await expect(list.getByRole("link", { name: "Open chat" })).toHaveAttribute("href", `/sessions/${matchedId}`);
  expect(posts).toEqual([]);
});

test("owned request details preserve replies and chat actions", async ({ page }) => {
  await page.goto(`/requests/${openId}`);
  await expect(page.getByRole("article", { name: "Introduction from Mira" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Accept & open chat" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Delete Request", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "Review replies" }).click();
  await expect(page).toHaveURL(/#request-replies$/);
  await page.goto(`/requests/${matchedId}`);
  await expect(page.getByRole("heading", { name: "Passport office morning run", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open chat", exact: true })).toHaveAttribute("href", `/sessions/${matchedId}`);
  await expect(page.getByRole("button", { name: "Delete Chat", exact: true })).toBeDisabled();
});

test("visitor detail has an accessible introduction and safe preview", async ({ page }) => {
  await page.goto(`/requests/${publicId}`);
  await expect(page.getByRole("heading", { name: "2-hour deep work & coffee sprint", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The plan", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your introduction", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Preview mode only" })).toBeDisabled();
  await expect(page.getByRole("link", { name: "Safety & reporting" })).toHaveAttribute("href", "/safety/reporting");
});

for (const width of [360, 768, 1440]) {
  test(`request layouts fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const [path, name] of [["/requests", "requests"], [`/requests/${publicId}`, "request-detail"], [`/requests/${openId}`, "request-replies"]]) {
      await page.goto(path);
      await expect(page.getByRole("main").getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator(".app-shell")).toHaveCSS("background-color", "rgb(248, 249, 255)");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/${name}-${width}.png`, fullPage: true });
    }
  });
}
