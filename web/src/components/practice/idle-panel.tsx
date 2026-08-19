"use client";

import { Phone, Users } from "lucide-react";
import { LEVELS, focusRing, languageByCode, type Level } from "./languages";
import { PRACTICE_PARTNER_LABEL } from "@/lib/labels";

type Stats = {
  sessionCount: number;
  avgScore: number;
  weekMinutes: number;
  onlinePartners?: number;
};

type Props = {
  native: string;
  learning: string;
  level: Level;
  stats: Stats;
  username: string;
  error: string;
  busy: boolean;
  onLevel: (level: Level) => void;
  onFind: () => void;
};

export function IdlePanel({
  native,
  learning,
  level,
  stats,
  error,
  busy,
  onLevel,
  onFind,
}: Props) {
  const nativeLang = languageByCode(native);
  const learningLang = languageByCode(learning);
  const onlineCount = stats.onlinePartners ?? 0;

  return (
    <section className="space-y-6">
      {/* Language & availability */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">You speak</p>
            <p className="font-medium text-foreground">{nativeLang?.flag} {nativeLang?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">You practice</p>
            <p className="font-medium text-foreground">{learningLang?.flag} {learningLang?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {onlineCount > 0
            ? `${onlineCount} partner${onlineCount === 1 ? "" : "s"} online`
            : "Searching for available partners…"}
        </div>
      </div>

      {/* Level selector */}
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your level</p>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => onLevel(lvl)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${focusRing} ${
                level === lvl
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Primary CTA */}
      <button
        type="button"
        disabled={busy}
        onClick={onFind}
        className={`flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors ${focusRing}`}
      >
        <Phone className="h-4 w-4" />
        {busy ? "Connecting…" : PRACTICE_PARTNER_LABEL}
      </button>
    </section>
  );
}
