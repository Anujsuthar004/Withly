import { defineConfig, devices } from "@playwright/test";

// Public-surface checks only, never the mock preview suite.
const baseURL = process.env.BASE_URL || "https://withly.in";
if (new URL(baseURL).protocol !== "https:") throw new Error("Live checks require HTTPS.");

export default defineConfig({
  testDir: "./tests/production",
  workers: 1,
  timeout: 60_000,
  retries: 0,
  reporter: "list",
  use: { baseURL, ...devices["Desktop Chrome"], trace: "off" },
});
