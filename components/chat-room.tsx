"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Paperclip, SendHorizontal, Smile, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { sendMessageAction } from "@/app/workspace/actions";
import { hasSupabaseEnv } from "@/lib/env";
import { getFeedPerson, getInitials } from "@/lib/reference-content";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionMessage } from "@/lib/supabase/types";
import { formatRelativeTime } from "@/lib/utils";

interface ChatRoomProps {
  requestId: string;
  currentUserId: string;
  initialMessages: SessionMessage[];
  onStatus: (message: string) => void;
}

function getAvatarForName(name: string) {
  const hash = [...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
  return getFeedPerson(hash);
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

  const participantChips = useMemo(() => {
    const names = Array.from(
      new Set(messages.filter((message) => message.senderType === "user").map((message) => message.senderName))
    ).slice(0, 3);

    return names.length > 0 ? names : ["You"];
  }, [messages]);

  return (
    <div className="workspace-chat-shell">
      <div className="workspace-chat-top">
        <div className="workspace-chat-participants">
          {participantChips.map((name) => (
            <span key={name} className="workspace-chat-participant">
              {getInitials(name)}
            </span>
          ))}
        </div>
        <span className="workspace-chat-count">{participantChips.length} companions active</span>
      </div>

      {isDisconnected ? (
        <div className="workspace-chat-banner" role="status" aria-live="polite">
          <WifiOff size={14} />
          Live updates paused. Reload the page to reconnect.
        </div>
      ) : null}

      <div ref={scrollRef} className="workspace-chat-thread">
        {messages.length === 0 ? <div className="workspace-chat-empty">No messages yet. Confirm the exact landmark and share your ETA here.</div> : null}

        {messages.map((message) => {
          if (message.senderType === "system") {
            return (
              <div key={message.id} className="workspace-chat-system">
                <span>{message.body}</span>
              </div>
            );
          }

          const isSelf = message.senderId === currentUserId;

          return (
            <article key={message.id} className={`workspace-chat-message ${isSelf ? "self" : ""}`}>
              {!isSelf ? (
                <span className="workspace-chat-avatar">
                  <Image src={getAvatarForName(message.senderName)} alt={message.senderName} fill sizes="40px" />
                </span>
              ) : (
                <span className="workspace-chat-you">YOU</span>
              )}

              <div className="workspace-chat-bubble-wrap">
                <div className="workspace-chat-bubble">
                  <p>{message.body}</p>
                </div>
                <div className="workspace-chat-meta">
                  <span>{message.senderName}</span>
                  <span>{formatRelativeTime(message.createdAt)}</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <form
        className="workspace-chat-form"
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
          placeholder="Type a message or drop a file..."
          maxLength={700}
          disabled={isPending}
        />
        <div className="workspace-chat-form-actions">
          <button type="button" aria-label="Attach file" disabled>
            <Paperclip size={16} />
          </button>
          <button type="button" aria-label="Add emoji" disabled>
            <Smile size={16} />
          </button>
          <button type="submit" className="workspace-chat-send" disabled={isPending || body.trim().length === 0}>
            {isPending ? <span className="btn-spinner" /> : <SendHorizontal size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
