"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, PhoneOff, RefreshCw, AlertTriangle, Lock, UserPlus, UserCheck } from "lucide-react";

import type { Partner, PracticeSession } from "@/lib/api";
import type { VoiceStatus } from "@/hooks/use-voice-call";

import { PROMPTS, displayName, focusRing, initials, languageLabel } from "./languages";
import { formatElapsed } from "./time";

type Props = {
  session: PracticeSession;
  partner: Partner;
  myUsername: string;
  myId: string;
  isPremium: boolean;
  voiceStatus: VoiceStatus;
  muted: boolean;
  speakerOn: boolean;
  micReady: boolean;
  voiceError: string;
  onRetry: () => void;
  remoteRef: RefObject<HTMLAudioElement | null>;
  onMute: () => void;
  onSpeaker: () => void;
  onEnableMic: () => void;
  onEnd: () => void;
  ending: boolean;
  onOpenPremiumModal?: () => void;
  onOpenChat?: () => void;
  isFriend?: boolean;
  addingFriend?: boolean;
  onAddFriend?: () => void;
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function SessionPanel({
  session,
  partner,
  myUsername,
  myId,
  isPremium,
  voiceStatus,
  muted,
  speakerOn,
  micReady,
  voiceError,
  onRetry,
  remoteRef,
  onMute,
  onSpeaker,
  onEnableMic,
  onEnd,
  ending,
  onOpenPremiumModal,
  onOpenChat,
  isFriend,
  addingFriend,
  onAddFriend,
}: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const name = displayName(partner.username);
  const partnerInitials = initials(partner.username);
  const isLive = voiceStatus === "live";
  const isConnecting = voiceStatus === "connecting" || voiceStatus === "waiting";

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="animate-fadeUp motion-reduce:animate-none space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 sm:p-7 shadow-sm text-card-foreground space-y-5">
        <audio ref={remoteRef} autoPlay playsInline />

        {/* Live Call Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold text-sm shadow-sm">
                {partnerInitials}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                  isLive ? "bg-emerald-500" : "bg-muted-foreground"
                }`}
              />
            </div>
            <div>
              <div className="font-extrabold text-sm sm:text-base text-card-foreground leading-tight">{name}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-0.5">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{shortId(partner.id)}</span>
                <span>·</span>
                <span>{languageLabel(partner.native_language)}</span>
              </div>
            </div>
          </div>

          <div className="text-right space-y-0.5">
            <div className="font-mono text-xs sm:text-sm font-bold text-card-foreground">{formatElapsed(session.started_at, now)}</div>
            <div
              className={`text-[11px] font-semibold flex items-center justify-end gap-1.5 ${
                isLive ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
              <span>{isLive ? "Live Call" : isConnecting ? "Connecting…" : "Waiting"}</span>
            </div>
          </div>
        </div>

        {/* Audio Visualizer Tiles */}
        <div className="grid grid-cols-2 gap-3">
          <CallTile
            label={myUsername || "You"}
            shortId={shortId(myId)}
            live={isLive && micReady}
            micOff={!micReady}
            onEnableMic={onEnableMic}
          />
          <CallTile
            label={name}
            shortId={shortId(partner.id)}
            live={isLive}
          />
        </div>

        {/* Error / Status notices */}
        {voiceError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{voiceError}</span>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded-md bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground hover:bg-destructive/90 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : isConnecting ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted p-3 text-xs text-muted-foreground font-medium">
            <span className="h-2 w-2 rounded-full bg-foreground animate-ping" />
            <span>Establishing secure audio connection…</span>
          </div>
        ) : null}

        {/* Dynamic Topic Prompt Card */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-3.5 space-x-3">
          <div className="flex items-start gap-2.5">
            <span className="text-base">💡</span>
            <p className="text-xs font-medium leading-relaxed text-muted-foreground">{prompt}</p>
          </div>
          <button
            type="button"
            aria-label="New topic prompt"
            onClick={() => setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground transition-colors ${focusRing}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Call Control Dock Bar */}
        <div className="flex items-center gap-2 pt-1">
          <ControlButton
            label={muted ? "Unmute mic" : "Mute mic"}
            active={muted}
            onClick={onMute}
            icon={muted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4 text-foreground" />}
          />

          <ControlButton
            label={speakerOn ? "Mute speaker" : "Unmute speaker"}
            active={!speakerOn}
            onClick={onSpeaker}
            icon={speakerOn ? <Volume2 className="h-4 w-4 text-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
          />

          <button
            type="button"
            disabled={addingFriend}
            onClick={() => {
              if (!isPremium) {
                onOpenPremiumModal?.();
                return;
              }
              if (!isFriend) onAddFriend?.();
            }}
            title={
              !isPremium
                ? "Add friend is a Premium feature"
                : isFriend
                  ? "Saved to your friend list"
                  : "Add this partner to your friend list"
            }
            aria-label="Add friend"
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${focusRing} ${
              isFriend
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            {isFriend ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {!isPremium ? (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted text-[9px]">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isPremium) {
                onOpenPremiumModal?.();
                return;
              }
              onOpenChat?.();
            }}
            title={isPremium ? "Open text chat beside this voice call" : "Messaging is a Premium feature (Click to unlock)"}
            aria-label="Chat"
            className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-all ${focusRing}`}
          >
            <MessageSquare className="h-4 w-4" />
            {!isPremium ? (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted text-[9px]">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={onEnd}
            disabled={ending}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive py-3 text-xs font-extrabold uppercase tracking-wider text-destructive-foreground shadow-sm hover:bg-destructive/90 active:scale-[0.98] disabled:opacity-50 transition-all ${focusRing}`}
          >
            <PhoneOff className="h-4 w-4" />
            <span>{ending ? "Ending Call…" : "End Call"}</span>
          </button>
        </div>

      </div>

      {/* Session Metadata Chip */}
      <div className="text-center">
        <span className="rounded-full border border-border bg-muted/40 px-3 py-1 font-mono text-[10px] text-muted-foreground">
          Session Token · {shortId(session.id)}
        </span>
      </div>
    </section>
  );
}

function CallTile({
  label,
  shortId,
  live,
  micOff,
  onEnableMic,
}: {
  label: string;
  shortId: string;
  live: boolean;
  micOff?: boolean;
  onEnableMic?: () => void;
}) {
  return (
    <div
      className={`relative flex aspect-[4/3] flex-col items-start justify-end overflow-hidden rounded-xl p-3 border border-border bg-muted/30 ${
        live ? "ring-2 ring-emerald-500/50 shadow-sm" : ""
      }`}
    >
      {/* Enable Mic Overlay */}
      {micOff && onEnableMic ? (
        <button
          type="button"
          onClick={onEnableMic}
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-background/90 text-foreground backdrop-blur-xs ${focusRing}`}
        >
          <MicOff className="h-5 w-5 text-destructive" />
          <span className="text-[11px] font-bold">Enable Mic</span>
        </button>
      ) : null}

      {/* Tile Information */}
      <div className="relative z-10 space-y-0.5">
        <div className="font-bold text-xs sm:text-sm text-card-foreground">{label}</div>
        <div className="font-mono text-[10px] text-muted-foreground uppercase">{shortId}</div>
      </div>

      {/* Live Audio Status Indicator */}
      <div
        className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${
          live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"
        }`}
      />
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  active,
  icon,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${focusRing} ${
        active
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
    </button>
  );
}
