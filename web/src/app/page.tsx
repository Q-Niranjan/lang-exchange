import Link from "next/link";
import {
  Mic, Star, MessageSquare, Globe, Trophy, Zap,
  ArrowRight, Check, Users, ShieldCheck, Clock,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Mic className="h-5 w-5 text-brand-blue-light" />,
    title: "Live 1:1 Voice Calls",
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
    icon: <Zap className="h-5 w-5 text-brand-blue-light" />,
    title: "Daily Streaks",
    body: "Track your practice streak and total talk time on your profile. Consistency beats intensity.",
  },
];

const PLAN_FEATURES = [
  "Unlimited voice matching sessions",
  "Live 1:1 peer-to-peer calls (WebRTC)",
  "Text chat with practice partners",
  "Friend list & call-again",
  "Daily streak & level tracker",
  "Full call history",
  "Peer ratings & fluency score",
  "Priority matching queue",
];

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-blue/10 blur-[120px] rounded-full" />
        </div>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 md:px-8 pt-20 pb-24 text-center space-y-8">

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-4 py-1.5 text-xs font-semibold text-brand-blue-light">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue" />
            </span>
            7-Day Free Trial — No Credit Card
          </div>

          <h1 className="font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[1.1] text-foreground">
            Practice any language with<br className="hidden sm:block" />
            <span className="text-brand-blue-light"> real native speakers</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            LangExchange pairs you instantly for live 1:1 voice exchange sessions.
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
          <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-brand-blue-light" /> Global community</span>
            <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-brand-blue-light" /> 14+ languages</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-brand-blue-light" /> Verified speakers</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-brand-blue-light" /> Real-time matching</span>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 pb-20">
        <div className="text-center mb-10 space-y-2">
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
      <section className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 pb-24">
        <div className="text-center mb-10 space-y-2">
          <h2 className="font-extrabold text-2xl sm:text-3xl text-foreground">Simple, transparent pricing</h2>
          <p className="text-sm text-muted-foreground">Start free for 7 days. No credit card required.</p>
        </div>

        <div className="mx-auto max-w-md rounded-2xl border border-brand-blue/40 bg-card p-8 space-y-6 shadow-blue-glow">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xl text-foreground">Premium Plan</span>
              <span className="rounded-full bg-brand-blue/15 px-3 py-1 text-[11px] font-bold text-brand-blue-light uppercase tracking-wider">
                7 Days Free
              </span>
            </div>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="font-extrabold text-3xl text-foreground">₹199</span>
              <span className="text-sm text-muted-foreground">/ month</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">After trial, billed monthly. Cancel anytime.</p>
          </div>

          <ul className="space-y-2.5">
            {PLAN_FEATURES.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-xs text-foreground">
                <Check className="h-4 w-4 shrink-0 text-brand-blue-light" />
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/register"
            className="flex items-center justify-center gap-2 w-full rounded-full bg-brand-blue py-3.5 text-sm font-bold text-white shadow-blue-glow hover:bg-brand-blue-dark transition-all active:scale-[0.98]"
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </Link>

          <p className="text-center text-[11px] text-muted-foreground">
            No credit card required during trial period.
          </p>
        </div>
      </section>

    </div>
  );
}
