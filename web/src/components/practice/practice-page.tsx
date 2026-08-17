"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useVoiceCall } from "@/hooks/use-voice-call";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { api, ApiError, ChatMessage, Conversation, IncomingCall, MatchResult, Partner, PracticeSession, RatingSummary, User } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

import { PageHeader } from "@/components/app/page-header";
import { useToast } from "@/components/app/toast-provider";
import { IdlePanel } from "./idle-panel";
import { LEVELS, type Level } from "./languages";
import { MatchingPanel } from "./matching-panel";
import { RatePanel } from "./rate-panel";
import { SessionPanel } from "./session-panel";
import { InSessionChat } from "./in-session-chat";
import { PremiumModal } from "./premium-modal";
import { IncomingCallModal } from "@/components/chat/incoming-call-modal";

type Phase = "idle" | "matching" | "session" | "rate";

const LEVEL_KEY = "puente_level";

function fallbackPartner(session: PracticeSession, userId: string, existing?: Partner): Partner {
  if (existing) return existing;
  const id = userId === session.user_a_id ? session.user_b_id : session.user_a_id;
  return { id, username: "Partner" };
}

export function PracticePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [native, setNative] = useState("en");
  const [learning, setLearning] = useState("es");
  const [hasSavedLanguages, setHasSavedLanguages] = useState(false);
  const [level, setLevel] = useState<Level>("Intermediate");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const toast = useToast();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState<ChatMessage | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [addingFriend, setAddingFriend] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<PracticeSession | null>(null);
  const partnerLeftRef = useRef(false);
  const endingSelfRef = useRef(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    const stored = window.localStorage.getItem(LEVEL_KEY);
    if (stored && (LEVELS as readonly string[]).includes(stored)) {
      setLevel(stored as Level);
    }
    setReady(true);
  }, [router]);

  const me = useQuery({
    queryKey: ["me"],
    enabled: ready,
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const rating = useQuery({
    queryKey: ["my-rating", me.data?.id],
    enabled: Boolean(me.data?.id),
    queryFn: () => api<RatingSummary>(`/api/v1/users/${me.data!.id}/rating`),
  });

  const status = useQuery({
    queryKey: ["match-status"],
    enabled: ready,
    queryFn: () => api<MatchResult>("/api/v1/practice/match/status"),
    refetchInterval: phase === "session" ? false : 3000,
  });

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void api("/api/v1/presence/heartbeat", { method: "POST", body: JSON.stringify({}) }).catch(() => undefined);
    }, 25000);
    return () => window.clearInterval(id);
  }, [ready]);

  useEffect(() => {
    if (!me.data?.profile) return;
    if (me.data.profile.native_language) {
      setNative(me.data.profile.native_language);
      setHasSavedLanguages(true);
    }
    if (me.data.profile.learning_language) {
      setLearning(me.data.profile.learning_language);
      setHasSavedLanguages(true);
    }
  }, [me.data]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const showToast = useCallback((message: string) => {
    toast.success(message);
  }, [toast]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error, toast]);

  const saveLanguages = async (nat: string, learn: string) => {
    try {
      await api("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ native_language: nat, learning_language: learn }),
      });
      setHasSavedLanguages(true);
      showToast("Language preference saved!");
      void qc.invalidateQueries({ queryKey: ["me"] });
    } catch {
      /* ignore transient errors */
    }
  };

  const enterSession = useCallback((res: MatchResult) => {
    if (!res.session || !me.data) return;
    sessionRef.current = res.session;
    endingSelfRef.current = false;
    setIncomingCall(null);
    setSession(res.session);
    setPartner(fallbackPartner(res.session, me.data.id, res.partner));
    setError("");
    setBusy(false);
    setChatOpen(false);
    setChatId(null);
    setIsFriend(false);
    setPhase("session");
    if (!streamRef.current) {
      void navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((media) => {
          streamRef.current = media;
          setStream(media);
        })
        .catch(() => undefined);
    }
  }, [me.data]);

  useEffect(() => {
    if (!partner?.id || !me.data?.is_premium) {
      setIsFriend(false);
      return;
    }
    let cancelled = false;
    void api<{ is_friend: boolean }>(`/api/v1/friends/${partner.id}`)
      .then((res) => {
        if (!cancelled) setIsFriend(Boolean(res.is_friend));
      })
      .catch(() => {
        if (!cancelled) setIsFriend(false);
      });
    return () => {
      cancelled = true;
    };
  }, [partner?.id, me.data?.is_premium]);

  useEffect(() => {
    if (!status.data || !me.data || phase === "session") return;
    if (status.data.status === "incoming" && status.data.incoming_call) {
      setIncomingCall(status.data.incoming_call);
      return;
    }
    if (phase !== "idle") return;
    if (status.data.status === "matched" && status.data.session?.status === "active") {
      enterSession(status.data);
    }
  }, [status.data, me.data, phase, enterSession]);

  useEffect(() => {
    if (phase !== "matching") return;
    const id = window.setInterval(async () => {
      try {
        const res = await api<MatchResult>("/api/v1/practice/match/status");
        if (res.status === "matched" && res.session?.status === "active") {
          enterSession(res);
        }
      } catch {
        /* keep waiting */
      }
    }, 2000);
    return () => window.clearInterval(id);
  }, [phase, enterSession]);

  useEffect(() => {
    if (phase !== "session" || !session) return;
    const id = window.setInterval(async () => {
      try {
        const res = await api<MatchResult>(`/api/v1/practice/${session.id}`);
        if (res.session?.status && res.session.status !== "active") {
          setSession(res.session);
          if (res.partner) setPartner(res.partner);
          stopStream();
          setPhase("rate");
          if (partnerLeftRef.current) {
            showToast("Your partner left the session");
            partnerLeftRef.current = false;
          }
        }
      } catch {
        /* ignore transient errors */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [phase, session, stopStream, showToast]);

  const voice = useVoiceCall({
    enabled: phase === "session" && Boolean(session && me.data && partner),
    sessionId: session?.id ?? "",
    userId: me.data?.id ?? "",
    partnerId: partner?.id ?? "",
    localStream: stream,
    onHangup: () => {
      if (endingSelfRef.current) return;
      partnerLeftRef.current = true;
      const current = sessionRef.current;
      if (!current) return;
      void api<MatchResult>(`/api/v1/practice/${current.id}`)
        .then((res) => {
          if (res.session && res.session.status !== "active") {
            sessionRef.current = res.session;
            setSession(res.session);
            if (res.partner) setPartner(res.partner);
            setChatOpen(false);
            stopStream();
            setPhase("rate");
            showToast("Your partner left the session");
          }
        })
        .catch(() => undefined);
    },
  });

  useEffect(() => {
    if (voice.error) toast.error(voice.error);
  }, [voice.error, toast]);

  useChatSocket({
    enabled: ready && Boolean(me.data?.is_premium),
    onMessage: (msg) => setLiveMessage(msg),
    onIncomingCall: (call) => {
      if (phase !== "session") setIncomingCall(call);
    },
    onCallEnded: (sessionId) => {
      setIncomingCall((cur) => (cur?.session_id === sessionId ? null : cur));
    },
  });

  async function requestMic() {
    const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streamRef.current = media;
    setStream(media);
    return media;
  }

  async function onFind() {
    setError("");
    setBusy(true);
    try {
      await requestMic();
    } catch {
      setBusy(false);
      setError("Allow microphone access in the browser address bar to start a call.");
      return;
    }

    try {
      await api("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({ native_language: native, learning_language: learning }),
      });
    } catch {
      /* matching can still proceed */
    }

    setPhase("matching");
    setBusy(false);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await api<MatchResult>("/api/v1/practice/match", {
        method: "POST",
        body: JSON.stringify({ native_language: native, learning_language: learning }),
        signal: ac.signal,
      });
      if (res.status === "matched" && res.session) {
        enterSession(res);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setPhase("idle");
      stopStream();
      setError((err as ApiError).message || "Could not find a partner. Try again.");
    }
  }

  async function onCancel() {
    abortRef.current?.abort();
    abortRef.current = null;
    try {
      await api("/api/v1/practice/match/cancel", { method: "POST", body: JSON.stringify({}) });
    } catch {
      /* still leave the queue locally */
    }
    try {
      const res = await api<MatchResult>("/api/v1/practice/match/status");
      if (res.status === "matched" && res.session?.status === "active") {
        enterSession(res);
        return;
      }
    } catch {
      /* fall through to idle */
    }
    stopStream();
    setPhase("idle");
  }

  async function onEnd() {
    if (!session) return;
    endingSelfRef.current = true;
    setEnding(true);
    try {
      const ended = await api<PracticeSession>(`/api/v1/practice/${session.id}/end`, { method: "POST" });
      sessionRef.current = ended;
      setSession(ended);
      stopStream();
      setChatOpen(false);
      setPhase("rate");
    } catch (err) {
      setError((err as ApiError).message || "Could not end the session.");
    } finally {
      setEnding(false);
    }
  }

  async function onRate(score: number, comment: string) {
    if (!session) return;
    setRatingBusy(true);
    setError("");
    try {
      await api(`/api/v1/practice/${session.id}/rate`, {
        method: "POST",
        body: JSON.stringify({ score, comment: comment || undefined }),
      });
      showToast("Thanks — rating submitted");
      setSession(null);
      setPartner(null);
      endingSelfRef.current = false;
      setChatOpen(false);
      setChatId(null);
      setPhase("idle");
      void qc.invalidateQueries({ queryKey: ["match-status"] });
      void qc.invalidateQueries({ queryKey: ["my-rating"] });
      void qc.invalidateQueries({ queryKey: ["friends"] });
    } catch (err) {
      setError((err as ApiError).message || "Could not submit rating.");
    } finally {
      setRatingBusy(false);
    }
  }

  function onSkip() {
    setSession(null);
    setPartner(null);
    setError("");
    endingSelfRef.current = false;
    setChatOpen(false);
    setChatId(null);
    setPhase("idle");
    void qc.invalidateQueries({ queryKey: ["match-status"] });
    void qc.invalidateQueries({ queryKey: ["friends"] });
  }

  async function acceptIncoming() {
    if (!incomingCall) return;
    setCallBusy(true);
    try {
      try {
        await requestMic();
      } catch {
        /* Enable Mic overlay still available */
      }
      const res = await api<MatchResult>(`/api/v1/practice/${incomingCall.session_id}/accept`, { method: "POST" });
      enterSession(res);
    } catch (err) {
      setError((err as ApiError).message || "Could not join the call.");
    } finally {
      setCallBusy(false);
    }
  }

  async function declineIncoming() {
    if (!incomingCall) return;
    try {
      await api(`/api/v1/practice/${incomingCall.session_id}/end`, { method: "POST" });
    } catch {
      /* dismiss locally */
    }
    setIncomingCall(null);
  }

  async function openSessionChat() {
    if (!session || !me.data?.is_premium) return;
    try {
      const conv = await api<Conversation>(`/api/v1/chat/from-session/${session.id}`, { method: "POST" });
      setChatId(conv.id);
      setChatOpen(true);
    } catch (err) {
      setError((err as ApiError).message || "Could not open chat.");
    }
  }

  async function callPartnerAgain() {
    if (!partner) return;
    setCallBusy(true);
    try {
      try {
        await requestMic();
      } catch {
        setCallBusy(false);
        setError("Allow microphone access to call again.");
        return;
      }
      const res = await api<MatchResult>("/api/v1/practice/direct", {
        method: "POST",
        body: JSON.stringify({ partner_id: partner.id }),
      });
      enterSession(res);
    } catch (err) {
      setError((err as ApiError).message || "Could not start the call.");
    } finally {
      setCallBusy(false);
    }
  }

  async function addPartnerFriend() {
    if (!partner || !me.data?.is_premium) return;
    setAddingFriend(true);
    setError("");
    try {
      await api(`/api/v1/friends/${partner.id}`, { method: "POST" });
      setIsFriend(true);
      showToast("Added to friends — open Friends to call them again");
      void qc.invalidateQueries({ queryKey: ["friends"] });
    } catch (err) {
      setError((err as ApiError).message || "Could not add friend.");
    } finally {
      setAddingFriend(false);
    }
  }

  async function messagePartner() {
    if (!partner) return;
    try {
      await api<Conversation>(`/api/v1/chat/with/${partner.id}`, { method: "POST" });
      router.push("/app/chat");
    } catch (err) {
      setError((err as ApiError).message || "Could not open chat.");
    }
  }

  if (!ready) return null;

  return (
    <div className={`mx-auto w-full px-4 py-8 space-y-6 ${phase === "session" && chatOpen ? "max-w-4xl" : "max-w-xl"}`}>
      {phase === "idle" && (
        <PageHeader
          title="1:1 Practice"
          description="Find a partner for a live voice exchange session."
        />
      )}

      {phase === "idle" ? (
        <IdlePanel
          native={native}
          learning={learning}
          level={level}
          busy={busy}
          error={error}
          username={me.data?.username ?? ""}
          stats={{
            sessionCount: status.data?.stats?.session_count ?? 0,
            avgScore: rating.data?.avg_score ?? 0,
            weekMinutes: status.data?.stats?.week_minutes ?? 0,
            onlinePartners: status.data?.stats?.online_partners,
          }}
          onLevel={(next) => {
            setLevel(next);
            window.localStorage.setItem(LEVEL_KEY, next);
          }}
          onFind={() => void onFind()}
        />
      ) : null}

      {phase === "matching" ? (
        <MatchingPanel learning={learning} myUsername={me.data?.username ?? ""} error={error} onCancel={() => void onCancel()} />
      ) : null}

      {phase === "session" && session && partner && me.data ? (
        <div className={chatOpen ? "grid gap-4 lg:grid-cols-2" : ""}>
          <SessionPanel
            session={session}
            partner={partner}
            myUsername={me.data.username}
            myId={me.data.id}
            isPremium={me.data.is_premium}
            voiceStatus={voice.status}
            muted={voice.muted}
            speakerOn={voice.speakerOn}
            micReady={Boolean(stream)}
            voiceError={voice.error}
            onRetry={voice.retry}
            remoteRef={voice.remoteRef}
            onMute={voice.toggleMute}
            onSpeaker={voice.toggleSpeaker}
            onEnableMic={() => void requestMic().catch(() => setError("Allow microphone access to talk."))}
            onEnd={() => void onEnd()}
            ending={ending}
            onOpenPremiumModal={() => setShowPremiumModal(true)}
            onOpenChat={() => void openSessionChat()}
            isFriend={isFriend}
            addingFriend={addingFriend}
            onAddFriend={() => void addPartnerFriend()}
          />
          {chatOpen && chatId ? (
            <InSessionChat
              open={chatOpen}
              conversationId={chatId}
              myId={me.data.id}
              partner={partner}
              incoming={liveMessage}
              onClose={() => setChatOpen(false)}
            />
          ) : null}
        </div>
      ) : null}

      {phase === "rate" && session && partner ? (
        <RatePanel
          session={session}
          partner={partner}
          submitting={ratingBusy}
          error={error}
          isPremium={Boolean(me.data?.is_premium)}
          callBusy={callBusy}
          onSubmit={(score, comment) => void onRate(score, comment)}
          onSkip={onSkip}
          onMessage={() => void messagePartner()}
          onCallAgain={() => void callPartnerAgain()}
          isFriend={isFriend}
          addingFriend={addingFriend}
          onAddFriend={() => void addPartnerFriend()}
        />
      ) : null}

      <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      {incomingCall && phase !== "session" ? (
        <IncomingCallModal
          call={incomingCall}
          busy={callBusy}
          onAccept={() => void acceptIncoming()}
          onDecline={() => void declineIncoming()}
        />
      ) : null}
    </div>
  );
}
