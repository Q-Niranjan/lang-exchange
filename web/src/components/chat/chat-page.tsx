"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Phone, Users } from "lucide-react";
import Link from "next/link";

import {
  api,
  ApiError,
  type ChatMessage,
  type Conversation,
  type Friend,
  type IncomingCall,
  type MatchResult,
  type User,
} from "@/lib/api";
import { clearTokens, isLoggedIn } from "@/lib/auth";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { PracticeHeader } from "@/components/practice/header";
import { PremiumModal } from "@/components/practice/premium-modal";
import { IncomingCallModal } from "@/components/chat/incoming-call-modal";
import { ConversationThread } from "@/components/chat/conversation-thread";
import { displayName, focusRing, initials, languageLabel } from "@/components/practice/languages";

export function ChatPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPremium, setShowPremium] = useState(false);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [liveMessage, setLiveMessage] = useState<ChatMessage | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const me = useQuery({
    queryKey: ["me"],
    enabled: ready,
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const friends = useQuery({
    queryKey: ["friends"],
    enabled: ready && Boolean(me.data?.is_premium),
    queryFn: async () => {
      const res = await api<{ friends: Friend[] }>("/api/v1/friends");
      return res.friends ?? [];
    },
    refetchInterval: 8000,
  });

  const inbox = useQuery({
    queryKey: ["chat-inbox"],
    enabled: ready && Boolean(me.data?.is_premium),
    queryFn: () => api<Conversation[]>("/api/v1/chat"),
    refetchInterval: 8000,
  });

  const status = useQuery({
    queryKey: ["match-status"],
    enabled: ready,
    queryFn: () => api<MatchResult>("/api/v1/practice/match/status"),
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (status.data?.status === "incoming" && status.data.incoming_call) {
      setIncoming(status.data.incoming_call);
    }
  }, [status.data]);

  useEffect(() => {
    if (status.data?.status === "matched" && status.data.session?.status === "active") {
      router.replace("/app");
    }
  }, [status.data, router]);

  useChatSocket({
    enabled: ready && Boolean(me.data?.is_premium),
    onMessage: (msg) => {
      setLiveMessage(msg);
      void qc.invalidateQueries({ queryKey: ["chat-inbox"] });
    },
    onIncomingCall: (call) => setIncoming(call),
    onCallEnded: (sessionId) => {
      setIncoming((cur) => (cur?.session_id === sessionId ? null : cur));
    },
  });

  const activeFriend = useMemo(
    () => friends.data?.find((f) => f.conversation_id === activeId),
    [friends.data, activeId],
  );
  const activeConv = useMemo(
    () => inbox.data?.find((c) => c.id === activeId),
    [inbox.data, activeId],
  );
  const partner = activeFriend
    ? {
        id: activeFriend.id,
        username: activeFriend.username,
        native_language: activeFriend.native_language,
        learning_language: activeFriend.learning_language,
      }
    : activeConv?.partner;

  async function callAgain(partnerId: string) {
    setError("");
    setCallBusy(true);
    try {
      await api<MatchResult>("/api/v1/practice/direct", {
        method: "POST",
        body: JSON.stringify({ partner_id: partnerId }),
      });
      router.push("/app");
    } catch (err) {
      setError((err as ApiError).message || "Could not start the call.");
    } finally {
      setCallBusy(false);
    }
  }

  async function acceptCall() {
    if (!incoming) return;
    setCallBusy(true);
    try {
      await api<MatchResult>(`/api/v1/practice/${incoming.session_id}/accept`, { method: "POST" });
      router.push("/app");
    } catch (err) {
      setError((err as ApiError).message || "Could not join the call.");
    } finally {
      setCallBusy(false);
    }
  }

  async function declineCall() {
    if (!incoming) return;
    try {
      await api(`/api/v1/practice/${incoming.session_id}/end`, { method: "POST" });
    } catch {
      /* still dismiss locally */
    }
    setIncoming(null);
  }

  if (!ready) return null;

  if (me.data && !me.data.is_premium) {
    return (
      <div className="mx-auto w-full max-w-[540px] px-4 pb-16 pt-8 space-y-6">
        <PracticeHeader
          username={me.data.username}
          isPremium={false}
          onOpenPremium={() => setShowPremium(true)}
          onLogout={() => {
            clearTokens();
            router.push("/");
          }}
        />
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
          <h1 className="font-extrabold text-xl">Premium Chat</h1>
          <p className="text-sm text-muted-foreground">
            Direct messaging, friend list, and call-again are included with Premium.
          </p>
          <button
            type="button"
            onClick={() => setShowPremium(true)}
            className="rounded-xl bg-primary px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-primary-foreground"
          >
            Unlock Premium
          </button>
        </div>
        <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8 space-y-4">
      <PracticeHeader
        username={me.data?.username ?? ""}
        isPremium={me.data?.is_premium}
        onOpenPremium={() => setShowPremium(true)}
        onLogout={() => {
          clearTokens();
          router.push("/");
        }}
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr] min-h-[70vh]">
        <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col min-h-[420px]">
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold">
              <MessageSquare className="h-3.5 w-3.5" />
              Chats
            </div>
            <Link href="/app/friends" className={`inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-bold hover:bg-accent ${focusRing}`}>
              <Users className="h-3 w-3" />
              Friends
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto">
            <InboxList items={inbox.data ?? []} activeId={activeId} onOpen={(id) => setActiveId(id)} />
          </div>
        </section>

        <section className={`${activeId ? "flex" : "hidden lg:flex"} min-h-[420px]`}>
          {activeId && me.data ? (
            <div className="flex min-h-0 w-full flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <div className="font-extrabold text-sm">{displayName(partner?.username ?? "Partner")}</div>
                  <div className="text-[11px] text-muted-foreground">{languageLabel(partner?.native_language)}</div>
                </div>
                {partner?.id ? (
                  <button
                    type="button"
                    disabled={callBusy}
                    onClick={() => void callAgain(partner.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50 ${focusRing}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call again
                  </button>
                ) : null}
              </div>
              <ConversationThread
                conversationId={activeId}
                myId={me.data.id}
                partner={partner}
                incoming={liveMessage}
                compact
              />
            </div>
          ) : (
            <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-border bg-card/60 text-sm text-muted-foreground">
              Pick a conversation, or open Friends to call someone again.
            </div>
          )}
        </section>
      </div>

      {incoming ? (
        <IncomingCallModal
          call={incoming}
          busy={callBusy}
          onAccept={() => void acceptCall()}
          onDecline={() => void declineCall()}
        />
      ) : null}
      <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />
    </div>
  );
}

function InboxList({
  items,
  activeId,
  onOpen,
}: {
  items: Conversation[];
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <p className="p-6 text-center text-xs text-muted-foreground">
        No messages yet. Add a friend after a session, then message them from the Friends page.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className={`flex w-full items-center gap-3 p-3 text-left hover:bg-accent ${
              activeId === item.id ? "bg-muted" : ""
            }`}
          >
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-xs font-extrabold">
                {initials(item.partner?.username ?? "P")}
              </div>
              {item.unread > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground text-center">
                  {item.unread}
                </span>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-sm truncate">{displayName(item.partner?.username ?? "Partner")}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{relative(item.last_message_at)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground truncate">{item.last_message || "No messages yet"}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function relative(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
