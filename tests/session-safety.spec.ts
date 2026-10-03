import { expect, test } from "@playwright/test";

const sessionPath = "/sessions/d9fd0d36-e844-4133-a0a1-74488992ae98";

test("session exposes feedback, reporting, and blocking", async ({ page }) => {
  await page.goto(sessionPath);
  await expect(page.getByRole("button", { name: "Save session feedback" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit report" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Block companion" })).toBeVisible();
});

test("failed SOS does not claim companion was notified", async ({ page }) => {
  await page.goto(sessionPath);
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "SOS", exact: true }).click();
  await expect(page.getByText("This action is unavailable right now.", { exact: true })).toBeVisible();
  await expect(page.getByText("In-app safety alert sent", { exact: true })).toHaveCount(0);
});

test("failed check-in does not select a successful check-in state", async ({ page }) => {
  await page.goto(sessionPath);
  const checkIn = page.getByRole("button", { name: "I'm OK", exact: true });
  await checkIn.click();
  await expect(page.getByText("This action is unavailable right now.", { exact: true })).toBeVisible();
  await expect(checkIn).not.toHaveClass(/active/);
});

test("report form reaches its server action and preserves failed input", async ({ page }) => {
  await page.goto(sessionPath);
  await page.getByLabel("Reason", { exact: true }).fill("Harassment");
  await page.getByLabel("What happened?").fill("A test concern that should be retained on failure.");
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByText("This action is unavailable right now.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Reason", { exact: true })).toHaveValue("Harassment");
});

test("focus presets populate the compose form without publishing", async ({ page }) => {
  await page.goto("/requests/new");
  await page.getByRole("button", { name: /Deep Work Sprint/ }).click();
  await expect(page.getByPlaceholder(/2-hour deep work/)).toHaveValue("2-hour deep work & coffee sprint");
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
});
