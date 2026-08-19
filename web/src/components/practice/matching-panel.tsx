"use client";

import { useEffect, useState } from "react";
import { Search, Radio, X } from "lucide-react";
import { HELLO_WORDS, focusRing, languageByCode } from "./languages";
import { formatSeconds } from "./time";

type Props = {
  learning: string;
  myUsername: string;
  error: string;
  onCancel: () => void;
};

export function MatchingPanel({ learning, myUsername, error, onCancel }: Props) {
  const [seconds, setSeconds] = useState(0);
  const [flap, setFlap] = useState(languageByCode(learning)?.hello ?? "Hello");
  const lang = languageByCode(learning);

  useEffect(() => {
    const tick = window.setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const words = HELLO_WORDS;
    let index = 0;
    const id = window.setInterval(() => {
      index = (index + 1) % words.length;
      setFlap(words[index]);
    }, 1100);
    return () => window.clearInterval(id);
  }, [learning]);

  return (
    <section className="animate-fadeUp motion-reduce:animate-none">
      <div className="flex flex-col items-center rounded-xl border border-border bg-card p-6 sm:p-8 text-center shadow-sm text-card-foreground space-y-6">

        {/* Radar animation */}
        <div className="relative my-4 flex h-32 w-32 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-border animate-pingRing" />
          <span className="absolute inset-0 rounded-full border border-border/80 animate-pingRing" style={{ animationDelay: "0.8s" }} />
          <span className="absolute inset-0 rounded-full border border-border/60 animate-pingRing" style={{ animationDelay: "1.6s" }} />

          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Search className="h-6 w-6 animate-pulse" />
          </div>
        </div>

        {/* Dynamic Flip Greeting */}
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-5 py-2">
          <Radio className="h-4 w-4 text-foreground animate-pulse" />
          <span className="font-mono text-xl font-bold tracking-wide text-foreground">{flap}</span>
        </div>

        <div className="space-y-1 max-w-xs">
          <h2 className="font-extrabold text-lg text-card-foreground">
            Finding a {lang?.name ?? "Language"} Partner
          </h2>
          <p className="text-xs text-muted-foreground">
            Matching for <span className="text-foreground font-semibold">{myUsername || "you"}</span>… Stay on this page.
          </p>
        </div>

        {/* Elapsed Digital Timer */}
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-2.5">
          <span className="text-[10px] uppercase font-mono text-muted-foreground block mb-0.5">Queue Time</span>
          <span className="font-mono text-2xl sm:text-3xl font-extrabold text-foreground tracking-wider">
            {formatSeconds(seconds)}
          </span>
        </div>

        {/* Cancel CTA */}
        <button
          type="button"
          onClick={onCancel}
          className={`flex items-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent active:scale-[0.98] transition-all ${focusRing}`}
        >
          <X className="h-4 w-4" />
          <span>Cancel Search</span>
        </button>

      </div>
    </section>
  );
}
