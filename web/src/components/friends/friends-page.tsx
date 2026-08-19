"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, MessageSquare, Phone, Search, UserMinus } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { LoadingState } from "@/components/app/loading-state";
import { useToast } from "@/components/app/toast-provider";
import {
  api, ApiError, Conversation, Friend, FriendsListResponse,
  IncomingCall, MatchResult, User,
} from "@/lib/api";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { PremiumModal } from "@/components/practice/premium-modal";
import { IncomingCallModal } from "@/components/chat/incoming-call-modal";
import { displayName, initials, languageLabel } from "@/components/practice/languages";
import { PRACTICE_PARTNER_LABEL } from "@/lib/labels";

const PAGE_SIZE = 20;

export function FriendsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [showPremium, setShowPremium] = useState(false);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const toast = useToast();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const friends = useQuery({
    queryKey: ["friends", page, query],
    enabled: Boolean(me.data?.is_premium),
    queryFn: () =>
      api<FriendsListResponse>(`/api/v1/friends?page=${page}&limit=${PAGE_SIZE}${query ? `&q=${encodeURIComponent(query)}` : ""}`),
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
    onIncomingCall: (call) => setIncoming(call),
    onCallEnded: (sessionId) => setIncoming((cur) => (cur?.session_id === sessionId ? null : cur)),
  });

  async function message(friend: Friend) {
    try {
      await api<Conversation>(`/api/v1/chat/with/${friend.id}`, { method: "POST" });
      router.push("/app/chat");
    } catch (err) {
      toast.error((err as ApiError).message || "Could not open chat.");
    }
  }

  async function callAgain(friend: Friend) {
    setCallBusy(true);
    try {
      await api<MatchResult>("/api/v1/practice/direct", {
        method: "POST",
        body: JSON.stringify({ partner_id: friend.id }),
      });
      router.push("/app/practice");
    } catch (err) {
      toast.error((err as ApiError).message || "Could not start the call.");
    } finally {
      setCallBusy(false);
    }
  }

  async function remove(friend: Friend) {
    try {
      await api(`/api/v1/friends/${friend.id}`, { method: "DELETE" });
      toast.success("Friend removed.");
      void qc.invalidateQueries({ queryKey: ["friends"] });
    } catch (err) {
      toast.error((err as ApiError).message || "Could not remove friend.");
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
        <PageHeader title="Friends" description="Connect with your practice partners." />
        <EmptyState
          title="Friends is a premium feature"
          description="Add partners after sessions, then message or call them anytime."
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

  const list = friends.data?.friends ?? [];
  const totalPages = friends.data?.total_pages ?? 1;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader title="Friends" description="People you've practiced with." />

      {/* Search */}
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setQuery(search.trim()); setPage(1); }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends…"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary">
          Search
        </button>
      </form>

      {friends.isLoading ? (
        <LoadingState label="Loading friends…" />
      ) : list.length === 0 ? (
        <EmptyState
          title="No friends yet"
          description="Complete a practice session and add your partner as a friend."
          action={
            <Link href="/app/practice" className="text-sm font-medium text-primary hover:underline">
              {PRACTICE_PARTNER_LABEL}
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {list.map((friend) => (
            <li key={friend.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                    {initials(friend.username)}
                  </div>
                  <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card ${friend.online ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{displayName(friend.username)}</p>
                  <p className="text-xs text-muted-foreground">
                    {friend.online ? "Online" : "Offline"}
                    {friend.native_language ? ` · ${languageLabel(friend.native_language)}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void message(friend)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border py-2 text-xs font-medium hover:bg-secondary"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Chat
                </button>
                <button
                  type="button"
                  disabled={callBusy}
                  onClick={() => void callAgain(friend)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Phone className="h-3.5 w-3.5" /> Call
                </button>
                <button
                  type="button"
                  title="Remove"
                  onClick={() => void remove(friend)}
                  className="rounded-md border border-border px-2.5 py-2 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                >
                  <UserMinus className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-secondary"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-secondary"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {incoming && (
        <IncomingCallModal call={incoming} busy={callBusy} onAccept={() => void acceptCall()} onDecline={() => setIncoming(null)} />
      )}
    </div>
  );
}
