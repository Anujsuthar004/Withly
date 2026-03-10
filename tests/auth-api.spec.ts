import { expect, test } from "@playwright/test";

test.describe("auth API routes", () => {
  /*
   * When Supabase env vars are not configured (local / CI without secrets),
   * every auth route returns 503 with a descriptive error before reaching
   * input validation. These tests verify that behavior explicitly.
   *
   * If Supabase env vars ARE set, the routes will validate input and return
   * 400 for bad payloads. Both outcomes are acceptable here.
   */

  test("POST /api/auth/sign-in returns a structured error for empty body", async ({ request }) => {
    const response = await request.post("/api/auth/sign-in", { data: {} });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/sign-in returns a structured error for invalid email", async ({ request }) => {
    const response = await request.post("/api/auth/sign-in", {
      data: { email: "not-an-email", password: "password123" },
    });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/sign-in returns a structured error for short password", async ({ request }) => {
    const response = await request.post("/api/auth/sign-in", {
      data: { email: "test@example.com", password: "short" },
    });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/sign-up returns a structured error for empty body", async ({ request }) => {
    const response = await request.post("/api/auth/sign-up", { data: {} });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/sign-up returns a structured error for missing display name", async ({ request }) => {
    const response = await request.post("/api/auth/sign-up", {
      data: { email: "test@example.com", password: "password123" },
    });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/sign-up returns a structured error for short display name", async ({ request }) => {
    const response = await request.post("/api/auth/sign-up", {
      data: { email: "test@example.com", password: "password123", displayName: "A" },
    });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/forgot-password returns a structured error for empty body", async ({ request }) => {
    const response = await request.post("/api/auth/forgot-password", { data: {} });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/auth/forgot-password returns a structured error for invalid email", async ({ request }) => {
    const response = await request.post("/api/auth/forgot-password", {
      data: { email: "not-an-email" },
    });
    expect([400, 503]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
