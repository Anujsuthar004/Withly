"use client";

import { useEffect, useEffectEvent, useRef, useState, useTransition } from "react";
import { SendHorizontal, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { sendMessageAction } from "@/app/workspace/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionMessage } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

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
  const [isDisconnected, setIsDisconnected] = useState(false);

  const appendMessage = useEffectEvent((message: SessionMessage) => {
    setMessages((current) => {
      if (current.some((entry) => entry.id === message.id)) {
        return current;
      }
      return [...current, message];
    });
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
    const channel = supabase
      .channel(`request-messages:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload: {
          new: {
            id: number;
            request_id: string;
            sender_type: "user" | "system";
            sender_id: string | null;
            sender_name: string;
            body: string;
            created_at: string;
          };
        }) => {
          const raw = payload.new as {
            id: number;
            request_id: string;
            sender_type: "user" | "system";
            sender_id: string | null;
            sender_name: string;
            body: string;
            created_at: string;
          };

          appendMessage({
            id: raw.id,
            requestId: raw.request_id,
            senderType: raw.sender_type,
            senderId: raw.sender_id,
            senderName: raw.sender_name,
            body: raw.body,
            createdAt: raw.created_at,
          });
        }
      )
      .subscribe((status: string) => {
        setIsDisconnected(status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [requestId]);

  return (
    <div className="chat-room">
      {isDisconnected ? (
        <div className="chat-disconnected-banner" role="status" aria-live="polite">
          <WifiOff size={14} />
          Live updates paused — reload the page to reconnect.
        </div>
      ) : null}
      <div ref={scrollRef} className="chat-thread">
        {messages.length === 0 ? (
          <div className="empty-chat">No messages yet. Use the thread to confirm the exact meeting point and ETA.</div>
        ) : null}

        {messages.map((message) => {
          const isSelf = message.senderType === "user" && message.senderId === currentUserId;
          return (
            <article key={message.id} className={`chat-message ${isSelf ? "self" : ""} ${message.senderType}`}>
              <div className="chat-meta">
                <span>{message.senderName}</span>
                <span>{formatRelativeTime(message.createdAt)}</span>
              </div>
              <p>{message.body}</p>
            </article>
          );
        })}
      </div>

      <form
        className="chat-form"
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
          onChange={(event) => setBody(event.target.value)}
          placeholder="Share the meetup pin, ETA, or a check-in note..."
          maxLength={700}
          disabled={isPending}
        />
        <button type="submit" className="primary-button compact" disabled={isPending || body.trim().length === 0}>
          <SendHorizontal size={16} />
          Send
        </button>
      </form>
    </div>
  );
}
