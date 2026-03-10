import { expect, test } from "@playwright/test";

test.describe("health API", () => {
  test("GET /api/health returns ok status", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.now).toBeTruthy();
  });

  test("GET /api/health sets no-store cache header", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.headers()["cache-control"]).toBe("no-store");
  });
});
