"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Mic, Star, MessageSquare, Globe, Trophy, Zap,
  ArrowRight, Check, Users, ShieldCheck, Clock, Flame,
} from "lucide-react";

import { PRACTICE_PARTNER_LABEL } from "@/lib/labels";

const FEATURES = [
  {
    icon: <Mic className="h-5 w-5 text-brand-blue-light" />,
    title: PRACTICE_PARTNER_LABEL,
    body: "WebRTC peer-to-peer audio — no downloads, no scheduling. Connect instantly with a native speaker.",
  },
  {
    icon: <Globe className="h-5 w-5 text-brand-blue-light" />,
    title: "14+ Languages",
    body: "English, Spanish, French, Hindi, Japanese, Arabic, Chinese and more. New languages added regularly.",
  },
  {
    icon: <Trophy className="h-5 w-5 text-brand-blue-light" />,
    title: "Level Tracking",
    body: "Your level advances automatically as you talk — Beginner to Advanced based on real conversation time.",
  },
  {
    icon: <Star className="h-5 w-5 text-brand-blue-light" />,
    title: "Peer Ratings",
    body: "Rate every session. Build a verified fluency reputation that partners can see before matching.",
  },
  {
    icon: <MessageSquare className="h-5 w-5 text-brand-blue-light" />,
    title: "Persistent Chat",
    body: "Keep the conversation going over text. Friend list, inbox, and full message history included.",
  },
  {
    icon: <Flame className="h-5 w-5 text-brand-blue-light" />,
    title: "Daily Streaks",
    body: "Track your practice streak and total talk time on your profile. Consistency beats intensity.",
  },
];

const PLAN_FEATURES = [
  `Unlimited ${PRACTICE_PARTNER_LABEL.toLowerCase()} sessions`,
  "WebRTC peer-to-peer calls",
  "Text chat with practice partners",
  "Friend list & call-again",
  "Daily streak & level tracker",
  "Full call history",
  "Peer ratings & fluency score",
  "Priority matching queue",
];

const PLANS = {
  monthly: {
    id: "monthly",
    label: "Monthly",
    price: "₹199",
    period: "/ month",
    billed: "Billed monthly. Cancel anytime.",
    badge: "7 Days Free",
    badgeColor: "bg-brand-blue/15 text-brand-blue-light",
    savings: null,
    highlight: false,
  },
  yearly: {
    id: "yearly",
    label: "Yearly",
    price: "₹1,999",
    period: "/ year",
    billed: "₹166/mo · Billed annually. Save ₹389.",
    badge: "Best Value",
    badgeColor: "bg-amber-500/20 text-amber-400",
    savings: "Save 16%",
    highlight: true,
  },
};

export default function HomePage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const plan = PLANS[billing];

  return (
    <div className="relative min-h-screen bg-background text-foreground">

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-blue/8 blur-[140px] rounded-full" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 md:px-8 pt-20 pb-28 text-center space-y-8">

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-4 py-1.5 text-xs font-semibold text-brand-blue-light">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue" />
            </span>
            7-Day Free Trial — No Credit Card Required
          </div>

          <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1] text-foreground">
            Practice any language with
            <br className="hidden sm:block" />
            <span className="text-brand-blue-light"> real native speakers</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            LangExchange lets you {PRACTICE_PARTNER_LABEL.toLowerCase()} for live voice exchange.
            No flashcards, no scheduling. Just real conversation — globally.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand-blue px-8 py-3.5 text-sm font-bold text-white shadow-blue-glow hover:bg-brand-blue-dark transition-all active:scale-[0.98]"
            >
              Start Free 7-Day Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-brand-blue/40 transition-all"
            >
              I already have an account
            </Link>
          </div>

          {/* Social proof strip */}
          <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-brand-blue-light" /> Global community</span>
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-brand-blue-light" /> 14+ languages</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand-blue-light" /> Verified speakers</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-blue-light" /> Real-time matching</span>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 pb-24">
        <div className="text-center mb-12 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-blue-light">Why LangExchange</p>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-foreground">Everything you need to become fluent</h2>
          <p className="text-sm text-muted-foreground">All features included in the 7-day trial, then one simple plan.</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 space-y-3 hover:border-brand-blue/40 hover:shadow-blue-glow transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-brand-blue/20 bg-brand-blue/10">
                {f.icon}
              </div>
              <h3 className="font-bold text-base text-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 pb-28">
        <div className="text-center mb-10 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-blue-light">Pricing</p>
          <h2 className="font-extrabold text-2xl sm:text-3xl text-foreground">Simple, transparent pricing</h2>
          <p className="text-sm text-muted-foreground">Start free for 7 days. No credit card required.</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  billing === b
                    ? "bg-brand-blue text-white shadow-blue-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b === "yearly" ? "Yearly" : "Monthly"}
                {b === "yearly" && (
                  <span className="absolute -top-2.5 -right-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                    -16%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="mx-auto grid max-w-3xl grid-cols-1 sm:grid-cols-2 gap-5">
          {(["monthly", "yearly"] as const).map((b) => {
            const p = PLANS[b];
            const active = billing === b;
            return (
              <div
                key={b}
                onClick={() => setBilling(b)}
                className={`relative rounded-2xl border p-6 sm:p-7 space-y-5 cursor-pointer transition-all ${
                  p.highlight
                    ? "border-brand-blue/50 bg-brand-blue/5 shadow-blue-glow"
                    : "border-border bg-card"
                } ${active ? "ring-2 ring-brand-blue" : "hover:border-brand-blue/30"}`}
              >
                {/* Best value / savings ribbon */}
                {p.savings && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[11px] font-bold text-white whitespace-nowrap">
                    {p.savings} vs monthly
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-base text-foreground">{p.label}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 pt-1">
                    <span className="font-extrabold text-3xl text-foreground">{p.price}</span>
                    <span className="text-sm text-muted-foreground">{p.period}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{p.billed}</p>
                </div>

                <ul className="space-y-2">
                  {PLAN_FEATURES.slice(0, 5).map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-foreground">
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-blue-light" />
                      {item}
                    </li>
                  ))}
                  {b === "yearly" && (
                    <li className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                      <Zap className="h-3.5 w-3.5 shrink-0" />
                      365 days uninterrupted access
                    </li>
                  )}
                </ul>

                <Link
                  href="/register"
                  className={`flex items-center justify-center gap-2 w-full rounded-full py-3 text-sm font-bold transition-all active:scale-[0.98] ${
                    p.highlight
                      ? "bg-brand-blue text-white shadow-blue-glow hover:bg-brand-blue-dark"
                      : "border border-brand-blue/40 text-brand-blue-light hover:bg-brand-blue/10"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          No credit card required during 7-day trial. Cancel anytime.
        </p>
      </section>

    </div>
  );
}
