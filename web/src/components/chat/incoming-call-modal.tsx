"use client";

import { Phone, PhoneOff, User } from "lucide-react";

import type { IncomingCall } from "@/lib/api";
import { displayName, focusRing, initials, languageLabel } from "@/components/practice/languages";

type Props = {
  call: IncomingCall;
  busy?: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export function IncomingCallModal({ call, busy, onAccept, onDecline }: Props) {
  const name = displayName(call.partner?.username ?? "Partner");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl text-card-foreground space-y-5 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold text-xl shadow-sm">
            {call.partner?.username ? initials(call.partner.username) : <User className="h-7 w-7" />}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Incoming call
          </div>
          <h2 className="font-extrabold text-xl text-foreground">{name}</h2>
          <p className="text-xs text-muted-foreground">
            wants to practice again
            {call.partner?.native_language ? ` · ${languageLabel(call.partner.native_language)}` : ""}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onDecline}
            className={`flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-3 text-xs font-extrabold uppercase tracking-wider text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 ${focusRing}`}
          >
            <PhoneOff className="h-4 w-4" />
            Decline
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onAccept}
            className={`flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 ${focusRing}`}
          >
            <Phone className="h-4 w-4" />
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
