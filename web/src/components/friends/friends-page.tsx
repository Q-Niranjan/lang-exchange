"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Phone, Radio, UserMinus } from "lucide-react";

import { api, ApiError, type Conversation, type Friend, type IncomingCall, type MatchResult, type User } from "@/lib/api";
import { clearTokens, isLoggedIn } from "@/lib/auth";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { PracticeHeader } from "@/components/practice/header";
import { PremiumModal } from "@/components/practice/premium-modal";
import { IncomingCallModal } from "@/components/chat/incoming-call-modal";
import { displayName, focusRing, initials, languageLabel } from "@/components/practice/languages";

export function FriendsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
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
    onIncomingCall: (call) => setIncoming(call),
    onCallEnded: (sessionId) => {
      setIncoming((cur) => (cur?.session_id === sessionId ? null : cur));
    },
  });

  async function message(friend: Friend) {
    setError("");
    try {
      await api<Conversation>(`/api/v1/chat/with/${friend.id}`, { method: "POST" });
      router.push("/app/chat");
    } catch (err) {
      setError((err as ApiError).message || "Could not open chat.");
    }
  }

  async function callAgain(friend: Friend) {
    setError("");
    setCallBusy(true);
    try {
      await api<MatchResult>("/api/v1/practice/direct", {
        method: "POST",
        body: JSON.stringify({ partner_id: friend.id }),
      });
      router.push("/app");
    } catch (err) {
      setError((err as ApiError).message || "Could not start the call.");
    } finally {
      setCallBusy(false);
    }
  }

  async function remove(friend: Friend) {
    setError("");
    try {
      await api(`/api/v1/friends/${friend.id}`, { method: "DELETE" });
      void qc.invalidateQueries({ queryKey: ["friends"] });
    } catch (err) {
      setError((err as ApiError).message || "Could not remove friend.");
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
      /* still dismiss */
    }
    setIncoming(null);
  }

  function logout() {
    clearTokens();
    router.push("/");
  }

  if (!ready) return null;

  if (me.data && !me.data.is_premium) {
    return (
      <div className="mx-auto w-full max-w-[540px] px-4 pb-16 pt-8 space-y-6">
        <PracticeHeader username={me.data.username} isPremium={false} onOpenPremium={() => setShowPremium(true)} onLogout={logout} />
        <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
          <h1 className="font-extrabold text-xl">Friend list is Premium</h1>
          <p className="text-sm text-muted-foreground">Add practice partners, then tap Call again anytime.</p>
          <button type="button" onClick={() => setShowPremium(true)} className="rounded-xl bg-primary px-5 py-3 text-xs font-extrabold uppercase tracking-wider text-primary-foreground">
            Unlock Premium
          </button>
        </div>
        <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />
      </div>
    );
  }

  const list = friends.data ?? [];

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 pb-16 pt-8 space-y-4">
      <PracticeHeader username={me.data?.username ?? ""} isPremium={me.data?.is_premium} onOpenPremium={() => setShowPremium(true)} onLogout={logout} />

      <div className="space-y-1 px-1">
        <h1 className="font-extrabold text-xl text-foreground">Friends</h1>
        <p className="text-xs text-muted-foreground">People you added after a practice session. Tap Call again to start another voice call.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">{error}</div>
      ) : null}

      <section className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {friends.isLoading ? (
          <p className="p-6 text-center text-xs text-muted-foreground">Loading friends…</p>
        ) : list.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Radio className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-sm font-semibold">No friends yet</p>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
              Match for a live session, then tap <span className="font-bold text-foreground">Add friend</span> on the call or rating screen. They will show up here so you can call them again.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((friend) => (
              <li key={friend.id} className="p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xs font-extrabold">
                      {initials(friend.username)}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${friend.online ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm truncate">{displayName(friend.username)}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {friend.online ? "Online" : "Offline"}
                      {friend.native_language ? ` · ${languageLabel(friend.native_language)}` : ""}
                      {friend.session_count ? ` · ${friend.session_count} session${friend.session_count === 1 ? "" : "s"}` : ""}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <button
                    type="button"
                    onClick={() => void message(friend)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border border-border py-2.5 text-xs font-bold hover:bg-accent ${focusRing}`}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Message
                  </button>
                  <button
                    type="button"
                    disabled={callBusy}
                    onClick={() => void callAgain(friend)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 ${focusRing}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    Call again
                  </button>
                  <button
                    type="button"
                    title="Remove friend"
                    onClick={() => void remove(friend)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 ${focusRing}`}
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {incoming ? (
        <IncomingCallModal call={incoming} busy={callBusy} onAccept={() => void acceptCall()} onDecline={() => void declineCall()} />
      ) : null}
      <PremiumModal isOpen={showPremium} onClose={() => setShowPremium(false)} />
    </div>
  );
}
