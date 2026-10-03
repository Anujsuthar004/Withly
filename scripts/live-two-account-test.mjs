import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { connectChatRealtime } from "../lib/chat-realtime.ts";

// Legacy filename retained. THREE-account backend test, NOT browser E2E.
if (process.env.WITHLY_ALLOW_LIVE_TEST !== "yes") throw new Error("Creates temporary hosted fixtures. Set WITHLY_ALLOW_LIVE_TEST=yes explicitly.");
const config = process.env.WITHLY_TEST_ENV_FILE ? parseEnv(readFileSync(process.env.WITHLY_TEST_ENV_FILE, "utf8")) : process.env;
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey } = config;
assert(url && anonKey && serviceKey, "Supabase credentials required");
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(url, serviceKey, options);
const anonymous = createClient(url, anonKey, options);
const runId = randomUUID();
const users = [], requests = [], reports = [];

async function ok(operation, label) {
  const result = await operation;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}
async function denied(operation, message, label) {
  const { error } = await operation;
  assert(error, `${label}: unauthorized operation succeeded`);
  assert.match(error.message, message, `${label}: unexpected failure`);
}
async function account(name) {
  const email = `release-${name}-${runId}@example.invalid`, password = `Release!${randomUUID()}`;
  const { user } = await ok(admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Release test ${name}` } }), "Fixture account");
  users.push(user.id);
  const client = createClient(url, anonKey, options);
  // Admin-issued fixture link avoids solving CAPTCHA in backend automation;
  // verifyOtp still produces a normal member JWT used for every RLS assertion.
  const link = await ok(admin.auth.admin.generateLink({ type: "magiclink", email }), "Fixture link");
  await ok(client.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token }), "Fixture session");
  return { client, id: user.id };
}
async function status(id, expected) {
  const row = await ok(admin.from("requests").select("status").eq("id", id).single(), "Fixture status");
  assert.equal(row.status, expected);
}
async function match(host, peer, label) {
  const id = await ok(host.client.rpc("create_request", {
    lane_input: "social", title_input: `Release QA — ${label} (do not join)`,
    description_input: "Temporary automated release verification. Not a real meetup; removed after testing.",
    area_label_input: "Release test only", meetup_at_input: null, radius_km_input: 5,
    tags_input: ["release-test"], verified_only_input: true, check_in_enabled_input: true,
    expires_at_input: new Date(Date.now() + 10 * 60_000).toISOString(),
  }), "Create fixture request");
  requests.push(id);
  const detail = await ok(anonymous.rpc("get_public_request_detail", { request_id_input: id }), "Public discovery");
  assert.equal(detail.id, id);
  for (const field of ["areaLabel", "meetupAt", "hostDisplayName"]) assert.equal(detail[field] ?? null, null, `Public detail leaked ${field}`);
  const joinId = await ok(peer.client.rpc("submit_join_request", { request_id_input: id, intro_message_input: "Automated fixture join." }), "Join");
  await ok(host.client.rpc("review_join_request", { join_request_id_input: joinId, decision_input: "accepted" }), "Accept");
  await status(id, "matched");
  return id;
}
const say = (client, id, body) => ok(client.rpc("send_request_message", { request_id_input: id, body_input: body }), "Participant message");
async function realtimeExchange(host, peer, id) {
  // Real hosted WebSocket delivery, separate from the browser UI acceptance gate.
  for (const [sender, receiver] of [[host, peer], [peer, host]]) {
    const body = `Realtime acceptance ${randomUUID()}`;
    let delivered;
    let subscriptionTimer, deliveryTimer;
    const message = new Promise((resolve) => { delivered = resolve; });
    let live;
    try {
      await new Promise((resolve, reject) => {
        subscriptionTimer = setTimeout(() => reject(new Error("Realtime subscription timed out")), 20_000);
        live = connectChatRealtime(receiver.client, id, receiver.id, {
          onMessage(row) {
            // Only the actual INSERT callback satisfies live delivery, never catch-up.
            if (row.body === body && row.senderId === sender.id) delivered(row.id);
          },
          onSnapshot(rows) { assert(Array.isArray(rows)); },
          onState(state) {
            if (state === "live") resolve();
            else if (state === "paused") reject(new Error("Realtime controller paused"));
          },
        });
      });
      clearTimeout(subscriptionTimer);
      await Promise.all([
        say(sender.client, id, body),
        Promise.race([message, new Promise((_, reject) => {
          deliveryTimer = setTimeout(() => reject(new Error("Realtime message was not delivered")), 20_000);
        })]),
      ]);
    } finally {
      clearTimeout(subscriptionTimer);
      clearTimeout(deliveryTimer);
      await live?.dispose();
    }
  }
  console.log("PASS: hosted WebSocket message delivery in both participant directions (not browser UI).");
}
async function assertEnded(host, peer, id) {
  await status(id, "cancelled");
  for (const { client } of [host, peer]) {
    await denied(client.rpc("send_request_message", { request_id_input: id, body_input: "Must not arrive" }), /matched sessions|blocked/i, "Post-block message");
    await denied(client.rpc("submit_check_in", { request_id_input: id, status_input: "ok", note_input: "Must not arrive" }), /active|matched|blocked/i, "Post-block check-in");
    await denied(client.rpc("trigger_sos_alert", { request_id_input: id, location_text_input: "Must not notify" }), /active|matched|blocked/i, "Post-block SOS");
  }
}
try {
  console.log(`Hosted backend verification ${runId}; temporary fixtures only.`);
  const host = await account("host"), peer = await account("peer"), outsider = await account("outsider");
  const completed = await match(host, peer, "completion");
  await realtimeExchange(host, peer, completed);
  await say(host.client, completed, "Host fixture message");
  await say(peer.client, completed, "Peer fixture message");
  const messages = await ok(peer.client.from("request_messages").select("id").eq("request_id", completed), "Participant read");
  assert(messages.length >= 2, "Participant could not read chat");
  for (const client of [anonymous, outsider.client]) {
    const read = await client.from("request_messages").select("id").eq("request_id", completed);
    if (read.error) assert.match(read.error.message, /permission denied/i);
    else assert.equal(read.data.length, 0, "Private messages leaked to outsider");
  }
  assert.equal(await ok(outsider.client.rpc("get_request_session", { request_id_input: completed }), "Outsider session"), null, "Session leaked");
  await denied(outsider.client.rpc("send_request_message", { request_id_input: completed, body_input: "Unauthorized" }), /participants/i, "Outsider message");
  await denied(outsider.client.from("profiles").update({ role: "admin" }).eq("id", outsider.id), /permission denied/i, "Role escalation");
  await denied(outsider.client.rpc("expire_stale_requests"), /permission denied/i, "Member maintenance");
  await ok(host.client.rpc("submit_check_in", { request_id_input: completed, status_input: "ok", note_input: "Fixture check-in" }), "Check-in");
  for (const actor of [host, peer]) await ok(actor.client.rpc("complete_request_session", { request_id_input: completed, outcome_input: "completed", meet_again_input: true }), "Completion");
  await status(completed, "completed");
  console.log("PASS: discovery, matching, private chat, outsider denial, check-in and completion.");

  // Separate active sessions: completion cannot mask a broken block guard.
  const blocked = await match(host, peer, "active block");
  const reported = await match(host, outsider, "report and block");
  await say(peer.client, blocked, "Must succeed before block");
  await ok(host.client.rpc("block_user", { blocked_user_id_input: peer.id }), "Block active peer");
  await assertEnded(host, peer, blocked);
  await status(reported, "matched"); // The other pair must be unaffected.
  await say(outsider.client, reported, "Must succeed before report and block");
  reports.push(await ok(host.client.rpc("create_report", { request_id_input: reported, target_user_id_input: outsider.id, reason_input: "Other", details_input: "Automated release test, not a real incident.", block_target_input: true }), "Report and block"));
  await assertEnded(host, outsider, reported);
  console.log("PASS: active block/report cancel the correct sessions and deny chat, check-ins and SOS in both directions.");
} finally {
  const failures = [];
  async function clean(operation, label) {
    try { await ok(operation, label); } catch (error) { failures.push(error.message); }
  }
  // Cleanup is scoped ONLY to IDs generated by this invocation.
  if (reports.length) await clean(admin.from("reports").delete().in("id", reports), "Remove fixture reports");
  if (requests.length) await clean(admin.from("requests").delete().in("id", requests), "Remove fixture requests");
  for (const id of users) await clean(admin.auth.admin.deleteUser(id, false), `Delete fixture ${id}`);
  for (const [table, ids] of [["requests", requests], ["profiles", users], ["reports", reports]]) {
    if (!ids.length) continue;
    try { assert.equal((await ok(admin.from(table).select("id").in("id", ids), `Verify ${table} cleanup`)).length, 0, `${table} fixtures remain`); }
    catch (error) { failures.push(error.message); }
  }
  for (const id of users) {
    const result = await admin.auth.admin.getUserById(id);
    if (!result.error || result.error.status !== 404 && result.error.code !== "user_not_found") failures.push(`Auth cleanup unverified for ${id}`);
  }
  if (failures.length) throw new AggregateError(failures.map(message => new Error(message)), `Cleanup incomplete: ${failures.join("; ")}`);
  console.log("PASS: this run's request, profile, report and Auth fixture absence verified.");
}
console.log("HOSTED BACKEND CHECKS PASSED. Browser signup, email, CAPTCHA, two-browser realtime UI and account-delete UI need separate acceptance tests.");
