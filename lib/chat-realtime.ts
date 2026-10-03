import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { SessionMessage } from "./supabase/types";

export type ChatConnectionState = "connecting" | "live" | "paused";

type Callbacks = {
  onMessage: (message: SessionMessage) => void;
  onSnapshot: (messages: SessionMessage[]) => void;
  onState: (state: ChatConnectionState) => void;
};

export function mergeChatMessages(...groups: SessionMessage[][]): SessionMessage[] {
  const messages = new Map<number, SessionMessage>();
  for (const group of groups) for (const message of group) messages.set(message.id, message);
  return [...messages.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt) || a.id - b.id
  ).slice(-200);
}

// Wait for member authentication AND the Postgres listener, not just a socket join.
// A fresh authorized snapshot closes the SSR/subscription and reconnect gaps.
export function connectChatRealtime(
  client: SupabaseClient,
  requestId: string,
  currentUserId: string,
  callbacks: Callbacks,
) {
  let disposed = false;
  let channel: RealtimeChannel | undefined;
  let ready = false;
  let syncing = false;
  let syncAgain = false;
  let duringSync: SessionMessage[] = [];
  let readinessTimer: ReturnType<typeof setTimeout> | undefined;

  const state = (value: ChatConnectionState) => {
    if (!disposed) callbacks.onState(value);
  };

  async function sync() {
    if (disposed || !ready) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    duringSync = [];
    try {
      // This RPC validates the current participant and active session on every read.
      const { data, error } = await client.rpc("get_request_session", { request_id_input: requestId });
      if (disposed) return;
      if (error || !data || data.requestId !== requestId) {
        if (!error) callbacks.onSnapshot([]);
        state("paused");
        return;
      }
      callbacks.onSnapshot(mergeChatMessages(data.messages, duringSync));
      if (ready) state("live");
    } catch {
      state("paused");
    } finally {
      syncing = false;
      if (syncAgain && !disposed) { syncAgain = false; void sync(); }
    }
  }

  function markReady() {
    if (disposed) return;
    clearTimeout(readinessTimer);
    if (ready) return;
    ready = true;
    void sync();
  }

  state("connecting");
  readinessTimer = setTimeout(() => state("paused"), 20_000);
  void (async () => {
    try {
      const { data, error } = await client.auth.getSession();
      if (disposed) return;
      if (error || !data.session || data.session.user.id !== currentUserId) {
        state("paused");
        return;
      }
      await client.realtime.setAuth(data.session.access_token);
      if (disposed) return;
      channel = client.channel(`request-messages:${requestId}`, {
        config: { postgres_changes_options: { wait: true } },
      }).on("postgres_changes", {
        event: "INSERT", schema: "public", table: "request_messages",
        filter: `request_id=eq.${requestId}`,
      }, ({ new: row }) => {
        if (disposed || row.request_id !== requestId) return;
        const message: SessionMessage = {
          id: row.id, requestId: row.request_id, senderType: row.sender_type,
          senderId: row.sender_id, senderName: row.sender_name,
          body: row.body, createdAt: row.created_at,
        };
        if (syncing) duringSync.push(message);
        callbacks.onMessage(message);
      }).on("system", {}, (event) => {
        if (event.extension !== "postgres_changes") return;
        if (event.status === "ok") markReady();
        else { ready = false; state("paused"); }
      }).subscribe((status) => {
        // wait:true makes SUBSCRIBED contingent on database-listener readiness.
        if (status === "SUBSCRIBED") markReady();
        else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          ready = false;
          state("paused");
        }
      });
    } catch {
      state("paused");
    }
  })();

  return {
    catchUp: sync,
    async dispose() {
      disposed = true;
      clearTimeout(readinessTimer);
      if (channel) await client.removeChannel(channel);
    },
  };
}
