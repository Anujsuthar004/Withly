"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { Send, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { sendMessageAction } from "@/app/workspace/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionMessage } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";
import { connectChatRealtime, mergeChatMessages, type ChatConnectionState } from "@/lib/chat-realtime";

interface ChatRoomProps {
  requestId: string;
  currentUserId: string;
  initialMessages: SessionMessage[];
  onStatus: (message: string) => void;
}

export function ChatRoom({ requestId, currentUserId, initialMessages, onStatus }: ChatRoomProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [connection, setConnection] = useState<ChatConnectionState>("connecting");
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const appendMessage = useEffectEvent((message: SessionMessage) => {
    setMessages((current) => mergeChatMessages(current, [message]));
  });

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!hasSupabaseEnv) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const live = connectChatRealtime(supabase, requestId, currentUserId, {
      onMessage: appendMessage,
      onSnapshot: setMessages,
      onState: setConnection,
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") void live.catchUp();
    };
    const onOnline = () => setConnectionAttempt((attempt) => attempt + 1);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);

    return () => {
      void live.dispose();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [requestId, currentUserId, connectionAttempt]);

  return (
    <>
      {hasSupabaseEnv ? (
        <div className="wl-chat-banner" role="status" aria-live="polite">
          {connection === "paused" ? <WifiOff size={14} /> : null}
          {connection === "live" ? "Live chat connected" : connection === "connecting" ? "Connecting live chat…" : "Live updates paused."}
          {connection === "paused" ? (
            <button type="button" onClick={() => setConnectionAttempt((attempt) => attempt + 1)}>Reconnect chat</button>
          ) : null}
        </div>
      ) : null}

      {/* Thread */}
      <div ref={scrollRef} className="wl-chat-thread">
        {messages.length === 0 ? (
          <div className="wl-chat-empty">No messages yet. Confirm the exact landmark and share your ETA here.</div>
        ) : null}

        {messages.map((message) => {
          const isSelf = message.senderId === currentUserId;
          const isSystem = message.senderType === "system";

          return (
            <div
              key={message.id}
              className={`wl-bubble-wrap ${isSelf ? "wl-bubble-self" : ""} ${isSystem ? "wl-bubble-system" : ""}`}
            >
              <div className={`wl-bubble ${isSelf ? "wl-bubble-me" : isSystem ? "wl-bubble-sys" : "wl-bubble-them"}`}>
                {message.body}
              </div>
              <span className={`wl-bubble-meta ${isSelf ? "wl-meta-right" : ""}`}>
                {isSystem ? "System" : message.senderName} · {formatRelativeTime(message.createdAt)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Composer */}
      <form
        className="wl-chat-composer"
        onSubmit={(event) => {
          event.preventDefault();

          startTransition(async () => {
            const result = await sendMessageAction({
              requestId,
              body,
            });

            onStatus(result.message);
            if (!result.ok) {
              return;
            }

            setBody("");
            router.refresh();
          });
        }}
      >
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message…"
          aria-label="Message"
          maxLength={700}
          disabled={isPending}
        />
        <button
          type="submit"
          aria-label="Send message"
          className="wl-send-btn"
          disabled={isPending || body.trim().length === 0}
        >
          <Send size={19} />
        </button>
      </form>
    </>
  );
}
