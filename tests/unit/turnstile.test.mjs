import { test } from "node:test";
import assert from "node:assert/strict";
import { authChallengePreflight, verifyChallenge } from "../../lib/turnstile.ts";

const config = { siteKey: "site", secretKey: "secret", production: true, token: "token", ip: "127.0.0.1" };
test("Auth preflight requires production config and token without consuming it", () => {
  assert.equal(authChallengePreflight(config).ok, true);
  for (const override of [{ token: null }, { siteKey: "" }, { secretKey: "" }]) assert.equal(authChallengePreflight({ ...config, ...override }).ok, false);
});
test("production fails closed if either CAPTCHA key is missing", async () => {
  for (const override of [{ siteKey: "" }, { secretKey: "" }, { siteKey: "", secretKey: "" }]) {
    assert.equal((await verifyChallenge({ ...config, ...override })).ok, false);
  }
});
test("unconfigured development can use previews", async () => {
  assert.deepEqual(await verifyChallenge({ ...config, production: false, siteKey: "" }), { ok: true, bypassed: true });
});
test("configured CAPTCHA rejects a missing token without calling upstream", async () => {
  assert.equal((await verifyChallenge({ ...config, token: null }, () => { throw new Error("Must not fetch"); })).ok, false);
});
test("only explicit upstream success permits the action", async () => {
  for (const body of [null, {}, { success: false }, { success: "true" }]) {
    assert.equal((await verifyChallenge(config, async () => Response.json(body))).ok, false);
  }
  assert.equal((await verifyChallenge(config, async () => Response.json({ success: true }))).ok, true);
});
test("network, HTTP and malformed response failures stay closed", async () => {
  for (const fetcher of [async () => { throw new Error("Timeout"); }, async () => new Response("Bad gateway", { status: 502 }), async () => new Response("not JSON")]) {
    assert.equal((await verifyChallenge(config, fetcher)).ok, false);
  }
});
