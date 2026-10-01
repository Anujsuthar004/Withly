import { test } from "node:test";
import assert from "node:assert/strict";
import { authEmailRedirect } from "../../lib/auth-redirect.ts";

test("signup and recovery links use one callback path, regardless of trailing slash", () => {
  for (const base of ["https://withly.in", "https://withly.in/", "https://withly.in//"]) {
    for (const next of ["/profile", "/auth/reset-password"]) {
      const url = new URL(authEmailRedirect(base, "https://ignored.invalid", next));
      assert.equal(url.origin, "https://withly.in");
      assert.equal(url.pathname, "/auth/callback");
      assert.equal(url.searchParams.get("next"), next);
    }
  }
});
test("development can use its local origin", () => {
  assert.equal(new URL(authEmailRedirect("", "http://localhost:3100", "/profile")).origin, "http://localhost:3100");
});
