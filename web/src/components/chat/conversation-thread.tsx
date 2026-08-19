"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";

import { api, type ChatMessage, type ChatPartner } from "@/lib/api";
import { displayName, focusRing } from "@/components/practice/languages";

type Props = {
  conversationId: string;
  myId: string;
  partner?: ChatPartner | null;
  incoming?: ChatMessage | null;
  compact?: boolean;
};

export function ConversationThread({ conversationId, myId, partner, incoming, compact }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const name = displayName(partner?.username ?? "Partner");

  useEffect(() => {
    let cancelled = false;
    void api<ChatMessage[]>(`/api/v1/chat/${conversationId}`)
      .then((rows) => {
        if (!cancelled) setMessages([...rows].reverse());
      })
      .catch(() => {
        if (!cancelled) setMessages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!incoming || incoming.conversation_id !== conversationId) return;
    setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
  }, [incoming, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const msg = await api<ChatMessage>(`/api/v1/chat/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ type: "text", content }),
      });
      setMessages((prev) => [...prev, msg]);
      setDraft("");
    } catch {
      /* keep draft */
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${compact ? "" : "rounded-xl border border-border bg-card shadow-sm"}`}>
      {!compact ? (
        <div className="border-b border-border px-4 py-3">
          <div className="font-extrabold text-sm text-card-foreground">{name}</div>
          <div className="text-[11px] text-muted-foreground">Text chat · premium</div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            Start the conversation. You can also call {name.split(" ")[0]} again anytime.
          </p>
        ) : null}
        {messages.map((msg) => {
          const mine = msg.sender_id === myId;
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  mine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {msg.content}
                <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${name.split(" ")[0]}…`}
          className={`min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none md:text-sm ${focusRing}`}
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40 md:h-10 md:w-10 ${focusRing}`}
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
