import Link from "next/link";
import { Mic, Star, MessageSquare, ShieldCheck, Radio, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 md:px-8 py-12 sm:py-20 space-y-16 sm:space-y-24">

        {/* Hero Section */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          {/* Live Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <Radio className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Live 1:1 Voice Matching Network</span>
          </div>

          <h1 className="font-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tight text-foreground leading-[1.15]">
            Speak naturally with real native partners.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            EngFluency pairs you instantly for live 1:1 voice exchange sessions. 
            No flashcards, no scheduling, no friction. Just real conversation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
            >
              <span>Start Free Practice Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3.5 text-sm font-semibold text-card-foreground hover:bg-accent transition-all"
            >
              <span>I have an account</span>
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Mic className="h-5 w-5 text-foreground" />,
              title: "Instant 1:1 Voice Calls",
              body: "Real-time browser audio matching via WebRTC. No downloads or extra software needed.",
            },
            {
              icon: <Star className="h-5 w-5 text-foreground" />,
              title: "Peer Reviews & Ratings",
              body: "Rate your conversation after each session to build a verified fluency reputation.",
            },
            {
              icon: <MessageSquare className="h-5 w-5 text-foreground" />,
              title: "Persistent Connections",
              body: "Stay in touch with partners over text chat, keep a friend list, and call them again anytime.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 space-y-3 shadow-sm hover:border-foreground/20 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted">
                {f.icon}
              </div>
              <h3 className="font-bold text-base text-card-foreground">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.body}</p>
            </div>
          ))}
        </section>

        {/* Free vs Premium Breakdown */}
        <section className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-card-foreground">Membership Tiers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Start practicing for free or upgrade for chat, friends, and call-again</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-foreground" />
          </div>

          <div className="space-y-2.5">
            {[
              { label: "1:1 Live Voice Matching", tier: "Free Forever" },
              { label: "Peer Ratings & Review Stats", tier: "Free Forever" },
              { label: "Persistent Direct Messaging", tier: "Premium" },
              { label: "Partner Follow & Friend List", tier: "Premium" },
              { label: "Call Friends Again", tier: "Premium" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3 text-xs font-semibold"
              >
                <span className="text-foreground">{row.label}</span>
                <span
                  className={`font-mono ${
                    row.tier.includes("Free") ? "text-emerald-600 dark:text-emerald-400" : "text-primary"
                  }`}
                >
                  {row.tier}
                </span>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
