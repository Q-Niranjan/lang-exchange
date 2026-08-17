"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageSquare, Phone } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { useToast } from "@/components/app/toast-provider";
import {
  api, ApiError, ChatMessage, Conversation, Friend, FriendsListResponse,
  IncomingCall, MatchResult, User,
} from "@/lib/api";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { PremiumModal } from "@/components/practice/premium-modal";
import { IncomingCallModal } from "@/components/chat/incoming-call-modal";
import { ConversationThread } from "@/components/chat/conversation-thread";
import { displayName, initials, languageLabel } from "@/components/practice/languages";

const PAGE_SIZE = 20;

export function ChatPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPremium, setShowPremium] = useState(false);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [liveMessage, setLiveMessage] = useState<ChatMessage | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const toast = useToast();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const friends = useQuery({
    queryKey: ["friends-chat", page],
    enabled: Boolean(me.data?.is_premium),
    queryFn: () => api<FriendsListResponse>(`/api/v1/friends?page=${page}&limit=${PAGE_SIZE}`),
    refetchInterval: 8000,
  });

  const status = useQuery({
    queryKey: ["match-status"],
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
      router.replace("/app/practice");
    }
  }, [status.data, router]);

  useChatSocket({
    enabled: Boolean(me.data?.is_premium),
    onMessage: (msg) => {
      setLiveMessage(msg);
      void qc.invalidateQueries({ queryKey: ["chat-inbox"] });
    },
    onIncomingCall: (call) => setIncoming(call),
    onCallEnded: (sessionId) => setIncoming((cur) => (cur?.session_id === sessionId ? null : cur)),
  });

  const friendList = friends.data?.friends ?? [];
  const totalPages = friends.data?.total_pages ?? 1;

  const activeFriend = useMemo(
    () => friendList.find((f) => f.conversation_id === activeId),
    [friendList, activeId],
  );

  async function openChat(friend: Friend) {
    try {
      await api<Conversation>(`/api/v1/chat/with/${friend.id}`, { method: "POST" });
      setActiveId(friend.conversation_id);
    } catch (err) {
      toast.error((err as ApiError).message || "Could not open chat.");
    }
  }

  async function callAgain(partnerId: string) {
    setCallBusy(true);
    try {
      await api<MatchResult>("/api/v1/practice/direct", {
        method: "POST",
        body: JSON.stringify({ partner_id: partnerId }),
      });
      router.push("/app/practice");
    } catch (err) {
      toast.error((err as ApiError).message || "Could not start the call.");
    } finally {
      setCallBusy(false);
    }
  }

  async function acceptCall() {
    if (!incoming) return;
    setCallBusy(true);
    try {
      await api<MatchResult>(`/api/v1/practice/${incoming.session_id}/accept`, { method: "POST" });
      router.push("/app/practice");
    } catch (err) {
      toast.error((err as ApiError).message || "Could not join the call.");
    } finally {
      setCallBusy(false);
    }
  }

  if (me.isLoading) return <LoadingState />;

  if (me.data && !me.data.is_premium) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <PageHeader title="Chat" description="Message your practice partners." />
        <EmptyState
          title="Chat is a premium feature"
          description="Upgrade to send messages and stay in touch with partners."
          action={
            <Link href="/app/plan" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              View plans
            </Link>
          }
        />
        <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />
      </div>
    );
  }

  const partner = activeFriend
    ? {
        id: activeFriend.id,
        username: activeFriend.username,
        native_language: activeFriend.native_language,
        learning_language: activeFriend.learning_language,
      }
    : null;

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col px-4 py-6 sm:px-6 md:h-[calc(100vh-0px)]">
      <PageHeader title="Chat" description="Message your friends." />

      {/* Fixed-height split layout */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        {/* Friends / contacts list */}
        <aside className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-medium text-foreground">Friends</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {friends.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : friendList.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No friends yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {friendList.map((friend) => (
                  <li key={friend.id}>
                    <button
                      type="button"
                      onClick={() => void openChat(friend)}
                      className={`flex w-full items-center gap-3 p-3 text-left hover:bg-secondary transition-colors ${
                        activeId === friend.conversation_id ? "bg-secondary" : ""
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {initials(friend.username)}
                        </div>
                        <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-card ${friend.online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{displayName(friend.username)}</p>
                        <p className="text-xs text-muted-foreground">{friend.online ? "Online" : "Offline"}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded p-1 disabled:opacity-40 hover:bg-secondary">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded p-1 disabled:opacity-40 hover:bg-secondary">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </aside>

        {/* Chat area — fixed height, scrollable messages */}
        <section className="flex min-w-0 flex-1 flex-col rounded-lg border border-border bg-card overflow-hidden">
          {activeId && me.data && partner ? (
            <>
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{displayName(partner.username)}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeFriend?.online ? "Online" : "Offline"}
                    {partner.native_language ? ` · ${languageLabel(partner.native_language)}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={callBusy}
                  onClick={() => void callAgain(partner.id)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Phone className="h-3.5 w-3.5" /> Practice
                </button>
              </div>
              <ConversationThread
                conversationId={activeId}
                myId={me.data.id}
                partner={partner}
                incoming={liveMessage}
                compact
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p className="text-sm">Select a friend to start chatting</p>
            </div>
          )}
        </section>
      </div>

      {incoming && (
        <IncomingCallModal call={incoming} busy={callBusy} onAccept={() => void acceptCall()} onDecline={() => setIncoming(null)} />
      )}
    </div>
  );
}
