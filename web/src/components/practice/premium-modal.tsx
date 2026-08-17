"use client";

import { useRouter } from "next/navigation";
import { Crown, CheckCircle2, MessageSquare, Zap, X, ShieldCheck, Phone, Users } from "lucide-react";
import { focusRing } from "./languages";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function PremiumModal({ isOpen, onClose }: Props) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-fadeUp">
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
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue-light border border-brand-blue/20 shadow-sm mb-1">
            <Crown className="h-6 w-6" />
          </div>
          <h2 className="font-extrabold text-xl sm:text-2xl text-foreground tracking-tight">
            Upgrade to Premium
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Messaging, friend list, call-again and all practice features require an active plan.
          </p>
        </div>

        {/* Features List */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-xs font-medium">
          {[
            { icon: <MessageSquare className="h-4 w-4 text-brand-blue-light shrink-0" />, text: "Text chat beside live voice calls" },
            { icon: <Users className="h-4 w-4 text-brand-blue-light shrink-0" />, text: "Friend list of partners you practised with" },
            { icon: <Phone className="h-4 w-4 text-brand-blue-light shrink-0" />, text: "Call a friend again with one tap" },
            { icon: <Zap className="h-4 w-4 text-brand-blue-light shrink-0" />, text: "Unlimited voice matching sessions" },
            { icon: <ShieldCheck className="h-4 w-4 text-brand-blue-light shrink-0" />, text: "Full call history & streak tracking" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-2.5 text-foreground">
              {icon}
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Plan preview */}
        <div className="rounded-xl border border-brand-blue/30 bg-card p-4 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-foreground">Monthly Premium</span>
            <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-blue-light uppercase">
              Popular
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-xl text-foreground">₹199</span>
            <span className="text-xs text-muted-foreground">/ month</span>
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => { onClose(); router.push("/app/billing"); }}
            className={`w-full flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-3.5 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white shadow-blue-glow hover:bg-brand-blue-dark active:scale-[0.98] transition-all ${focusRing}`}
          >
            <Crown className="h-4 w-4" />
            View Plans & Upgrade
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
