import { expect, test } from "@playwright/test";

test("health and public pages are available", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toMatchObject({ status: "ok" });
  for (const path of ["/", "/explore", "/legal/privacy", "/legal/terms", "/legal/community", "/safety/reporting"]) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  }
});

test("unsafe callbacks stay on the application origin", async ({ request, baseURL }) => {
  for (const next of ["//evil.example", "/\\evil.example", "/\n/evil.example", "/%5cevil.example", "/%255cevil.example", "https://evil.example"]) {
    const response = await request.get(`/auth/callback?next=${encodeURIComponent(next)}`, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toBe(`${new URL(baseURL!).origin}/feed`);
  }
});

test("private export and maintenance reject anonymous callers", async ({ request }) => {
  for (const path of ["/api/account/export", "/api/cron/expire-requests"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect([401, 403]).toContain(response.status());
  }
});

test("signup rejects missing and invalid CAPTCHA without creating an account", async ({ request }) => {
  for (const captchaToken of ["", "invalid-release-check-token"]) {
    const response = await request.post("/api/auth/sign-up", {
      data: { email: `captcha-check-${Date.now()}@example.invalid`, password: "InvalidCaptchaOnly-ReleaseCheck!", displayName: "Release check", acceptedTerms: true, captchaToken },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error).toMatch(/anti-bot/i);
  }
});

test("signup shows consent, support and the production challenge container", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/", { waitUntil: "load" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your everyday.With a +1.");
  await expect.poll(() => page.locator('header img[src="/withly-logo.svg"]').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: "test-results/production-redesign-landing.png", fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Create Account", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /at least 18/ })).toBeVisible();
  await expect(page.locator(".turnstile-shell")).toBeAttached();
  await expect(page.getByRole("link", { name: "sutharanuj530@gmail.com" })).toBeVisible();
  // Rendering a container does NOT prove challenge success or email delivery.
});

test("direct Supabase Auth cannot bypass CAPTCHA", async ({ request }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  test.skip(!url || !key, "Supply public Supabase URL/key to verify the direct authentication boundary.");
  for (const token of [undefined, "invalid-release-check-token"]) {
    const response = await request.post(`${url}/auth/v1/signup`, {
      headers: { apikey: key! },
      data: { email: `direct-captcha-${Date.now()}@example.invalid`, password: "InvalidCaptchaOnly-ReleaseCheck!", gotrue_meta_security: { captcha_token: token } },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).error_code).toBe("captcha_failed");
  }
});
