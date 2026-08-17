"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, CheckCircle2, MessageSquare, Zap, X, ShieldCheck, Phone, Users } from "lucide-react";
import { api, User } from "@/lib/api";
import { focusRing } from "./languages";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function PremiumModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient();
  const [successMsg, setSuccessMsg] = useState("");

  const activateMutation = useMutation({
    mutationFn: async () => {
      try {
        return await api<{ status: string; message: string }>("/api/v1/payments/dummy-activate", {
          method: "POST",
        });
      } catch {
        // Fallback for demo mode if backend is using static/mock endpoint
        return { status: "success", message: "Premium Unlocked (Demo Mode)!" };
      }
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || "Premium Activated Successfully!");
      
      // Optimistically update user state in query cache
      queryClient.setQueryData<User>(["me"], (old) => {
        if (!old) return old;
        return {
          ...old,
          is_premium: true,
          premium_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      });

      queryClient.invalidateQueries({ queryKey: ["me"] });
      
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1200);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl text-card-foreground space-y-6">

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground hover:text-foreground transition-all ${focusRing}`}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm mb-1">
            <Crown className="h-6 w-6" />
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">
            Unlock Premium Access
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Messaging, friend list, and call-again with practice partners are <span className="font-bold text-foreground">Premium features</span>.
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-xs font-medium">
          <div className="flex items-center gap-2.5 text-foreground">
            <MessageSquare className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Text chat beside live voice — not voice-only</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground">
            <Users className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Friend list of partners you have practiced with</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground">
            <Phone className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Call a friend again with one tap</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground">
            <Zap className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Priority 1:1 Voice Session Matching</span>
          </div>
          <div className="flex items-center gap-2.5 text-foreground">
            <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
            <span>Saved conversation history</span>
          </div>
        </div>

        {/* Simulated Demo Plan Box */}
        <div className="rounded-xl border-2 border-primary/40 bg-card p-4 space-y-1.5 shadow-sm text-left">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-card-foreground">Monthly Pro Pass</span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary uppercase">
              Demo Mode
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-xl text-foreground">₹299</span>
            <span className="text-xs text-muted-foreground">/ month</span>
          </div>
        </div>

        {/* Status notice */}
        {successMsg ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        ) : null}

        {/* Action CTA Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            disabled={activateMutation.isPending || !!successMsg}
            onClick={() => activateMutation.mutate()}
            className={`w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all ${focusRing}`}
          >
            <Crown className="h-4 w-4" />
            <span>
              {activateMutation.isPending
                ? "Activating Demo Subscription…"
                : "Simulate & Unlock Premium (Demo Mode)"}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            Maybe Later
          </button>
        </div>

      </div>
    </div>
  );
}
