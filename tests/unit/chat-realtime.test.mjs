import { test } from "node:test";
import assert from "node:assert/strict";
import { connectChatRealtime, mergeChatMessages } from "../../lib/chat-realtime.ts";

const tick = () => new Promise((resolve) => setImmediate(resolve));
const message = (id) => ({ id, requestId: "room", senderType: "user", senderId: "peer", senderName: "Peer", body: `Message ${id}`, createdAt: "2026-10-03T00:00:00Z" });
function fixture() {
  const calls = [], states = [], snapshots = [], messages = [], handlers = {};
  let status;
  const channel = {
    on(event, _filter, handler) { handlers[event] = handler; return this; },
    subscribe(handler) { calls.push("subscribe"); status = handler; return this; },
  };
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: "me" }, access_token: "fixture-token" } } }) },
    realtime: { setAuth: async () => { calls.push("auth"); } },
    channel(_name, options) { assert.equal(options.config.postgres_changes_options.wait, true); calls.push("channel"); return channel; },
    rpc: async () => { calls.push("snapshot"); return { data: { requestId: "room", messages: [message(1)] }, error: null }; },
    removeChannel: async () => { calls.push("remove"); },
  };
  const start = () => connectChatRealtime(client, "room", "me", {
    onState: (state) => states.push(state), onSnapshot: (rows) => snapshots.push(rows), onMessage: (row) => messages.push(row),
  });
  return { client, start, calls, states, snapshots, messages, handlers, status: (value) => status(value) };
}

test("chat waits for authentication and database readiness before catch-up/live state", async () => {
  const f = fixture();
  let authenticated;
  f.client.realtime.setAuth = () => new Promise((resolve) => { authenticated = resolve; });
  const live = f.start();
  try {
    await tick();
    assert.deepEqual(f.calls, []);
    authenticated(); await tick();
    assert.deepEqual(f.calls, ["channel", "subscribe"]);
    assert.deepEqual(f.states, ["connecting"]);
    f.status("SUBSCRIBED"); await tick();
    assert.equal(f.calls.at(-1), "snapshot");
    assert.equal(f.states.at(-1), "live");
  } finally { live.dispose(); }
});

test("no session or wrong account never subscribes", async () => {
  for (const session of [null, { user: { id: "other" }, access_token: "wrong" }]) {
    const f = fixture(); f.client.auth.getSession = async () => ({ data: { session } });
    const live = f.start();
    try { await tick(); assert.deepEqual(f.calls, []); assert.equal(f.states.at(-1), "paused"); }
    finally { live.dispose(); }
  }
});

test("unmount while authentication is pending cannot create an orphan subscription", async () => {
  const f = fixture(); let resolve;
  f.client.realtime.setAuth = () => new Promise((done) => { resolve = done; });
  const live = f.start(); await tick(); live.dispose(); resolve(); await tick();
  assert.deepEqual(f.calls, []);
});

test("database system error and reconnect are surfaced and catch up again", async () => {
  const f = fixture(), live = f.start();
  try {
    await tick(); f.status("SUBSCRIBED"); await tick();
    f.handlers.system({ extension: "postgres_changes", status: "error" });
    assert.equal(f.states.at(-1), "paused");
    f.handlers.system({ extension: "postgres_changes", status: "ok" }); await tick();
    assert.equal(f.calls.filter((call) => call === "snapshot").length, 2);
    assert.equal(f.states.at(-1), "live");
  } finally { live.dispose(); }
});

test("catch-up preserves messages received while the snapshot is in flight", async () => {
  const f = fixture(); let resolve;
  f.client.rpc = () => new Promise((done) => { resolve = done; });
  const live = f.start();
  try {
    await tick(); f.status("SUBSCRIBED");
    const row = message(2);
    f.handlers.postgres_changes({ new: { id: row.id, request_id: "room", sender_type: row.senderType, sender_id: row.senderId, sender_name: row.senderName, body: row.body, created_at: row.createdAt } });
    resolve({ data: { requestId: "room", messages: [message(1)] }, error: null }); await tick();
    assert.deepEqual(f.snapshots.at(-1).map((item) => item.id), [1, 2]);
  } finally { live.dispose(); }
});

test("lost session access clears the snapshot instead of claiming a live chat", async () => {
  const f = fixture(); f.client.rpc = async () => ({ data: null, error: null });
  const live = f.start();
  try { await tick(); f.status("SUBSCRIBED"); await tick(); assert.deepEqual(f.snapshots, [[]]); assert.equal(f.states.at(-1), "paused"); }
  finally { live.dispose(); }
});

test("late callbacks cannot mutate a disposed chat", async () => {
  const f = fixture(), live = f.start(); await tick(); live.dispose();
  f.status("SUBSCRIBED"); f.status("CLOSED"); await tick();
  assert.deepEqual(f.states, ["connecting"]);
  assert.equal(f.snapshots.length, 0);
  assert.equal(f.calls.at(-1), "remove");
});

test("message merge deduplicates, orders and bounds the window", () => {
  assert.deepEqual(mergeChatMessages([message(2)], [message(1), message(2)]).map((row) => row.id), [1, 2]);
  assert.equal(mergeChatMessages(Array.from({ length: 250 }, (_, i) => message(i))).length, 200);
});
