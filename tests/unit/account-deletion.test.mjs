import { test } from "node:test";
import assert from "node:assert/strict";
import { deleteAccountData } from "../../lib/account-deletion.ts";
import { normalizeNextPath } from "../../lib/navigation.ts";

const userId = "10000000-0000-4000-8000-000000000001";
function fixture({ missingBucket = false, storageFailure = false, authFailure = false } = {}) {
  const calls = [];
  let pages = [[{ id: "avatar", name: "photo.jpg" }], []];
  const client = {
    storage: {
      getBucket: async () => ({ error: missingBucket ? { statusCode: "404" } : null }),
      from: () => ({
        list: async (prefix) => { assert.equal(prefix, userId); return { data: pages.shift(), error: null }; },
        remove: async (paths) => { calls.push(paths); return { error: storageFailure ? new Error("Storage unavailable") : null }; },
      }),
    },
    auth: { admin: { deleteUser: async (...args) => {
      calls.push(args); return { error: authFailure ? new Error("Auth unavailable") : null };
    } } },
  };
  return { client, calls };
}
test("avatar removal precedes explicit hard deletion", async () => {
  const { client, calls } = fixture();
  await deleteAccountData(client, userId);
  assert.deepEqual(calls, [[`${userId}/photo.jpg`], [userId, false]]);
});
test("account without an avatar bucket can be deleted", async () => {
  const { client, calls } = fixture({ missingBucket: true });
  await deleteAccountData(client, userId);
  assert.deepEqual(calls, [[userId, false]]);
});
test("storage failure does not delete auth or claim success", async () => {
  const { client, calls } = fixture({ storageFailure: true });
  await assert.rejects(deleteAccountData(client, userId), /Storage unavailable/);
  assert.equal(calls.length, 1);
});
test("auth deletion failure propagates", async () => {
  await assert.rejects(deleteAccountData(fixture({ authFailure: true }).client, userId), /Auth unavailable/);
});
test("invalid IDs cannot widen avatar cleanup scope", async () => {
  await assert.rejects(deleteAccountData(fixture().client, "../someone-else"), /Invalid account/);
});
test("redirects remain same-origin after URL normalization", () => {
  for (const input of ["//evil.test", "/\\evil.test", "/\t/evil.test", "/%5cevil.test", "/%255cevil.test", "javascript:alert(1)"]) {
    assert.equal(normalizeNextPath(input), "/feed");
  }
  assert.equal(normalizeNextPath("/requests?view=mine#latest"), "/requests?view=mine#latest");
});
