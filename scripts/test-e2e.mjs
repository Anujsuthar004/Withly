import { spawnSync } from "node:child_process";

if (process.env.BASE_URL) {
  throw new Error("Preview tests must not target an external deployment. Use npm run test:production for live public-surface checks.");
}

// Keep public-surface tests deterministic and prevent local .env files from
// connecting the test server to a real Supabase project.
const env = { ...process.env, APP_ENV: "test", PORT: process.env.PORT || "3100", NEXT_PUBLIC_SITE_URL: `http://localhost:${process.env.PORT || "3100"}` };
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY",
  "PUSH_WEBHOOK_SECRET", "CRON_SECRET",
]) env[key] = "";

function run(path, args) {
  const result = spawnSync(process.execPath, [path, ...args], { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!process.argv.includes("--skip-build")) {
  run("node_modules/next/dist/bin/next", ["build"]);
}
run("node_modules/@playwright/test/cli.js", ["test"]);
