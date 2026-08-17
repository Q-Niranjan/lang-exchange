"use client";

import { Sparkles, Star, Clock, Trophy, Users } from "lucide-react";
import { LEVELS, focusRing, languageByCode, type Level } from "./languages";

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
  username,
  error,
  busy,
  onLevel,
  onFind,
}: Props) {
  const learningLang = languageByCode(learning);
  const onlineCount = stats.onlinePartners ?? 1;

  return (
    <section className="animate-fadeUp motion-reduce:animate-none">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-10 shadow-sm text-card-foreground text-center space-y-6 max-w-lg mx-auto">

        {/* Centered Greeting & Real Online Partners Indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2 flex-wrap mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-1.5 text-xs font-semibold text-secondary-foreground">
              <Sparkles className="h-3.5 w-3.5 text-foreground" />
              <span>1:1 Live Practice Match</span>
            </div>

            {/* Real Online Partners Live Indicator */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <Users className="h-3.5 w-3.5" />
              <span>{onlineCount} {onlineCount === 1 ? "Partner" : "Partners"} Online</span>
            </div>
          </div>

          <h1 className="font-extrabold text-2xl sm:text-3xl tracking-tight text-foreground leading-tight">
            {username ? (
              <>
                Welcome back, <span className="underline decoration-border">{username.split(/[_\s]/)[0]}</span>!
              </>
            ) : (
              "Ready to speak?"
            )}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Connect with a partner for a live 5–15 min real voice exchange session.
          </p>
        </div>

        {/* Target Level Selector */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block text-center">
            Target Level
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onLevel(item)}
                className={`rounded-lg border py-2 text-xs font-bold transition-all ${focusRing} ${
                  level === item
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive text-center">
            <span>⚠️ {error}</span>
          </div>
        ) : null}

        {/* Centered Find Practice Partner Button */}
        <button
          type="button"
          onClick={onFind}
          disabled={busy || native === learning}
          className={`w-full rounded-xl bg-primary py-4 text-sm sm:text-base font-extrabold tracking-wide text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 ${focusRing}`}
        >
          {busy ? (
            <span className="flex items-center justify-center gap-2.5">
              <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
              Initializing Call…
            </span>
          ) : (
            `Find ${learningLang?.name ?? "Language"} Partner →`
          )}
        </button>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-2 border-t border-border pt-5 text-center">
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Trophy className="h-3.5 w-3.5 text-foreground" />
              <span className="text-[10px] font-medium uppercase">Sessions</span>
            </div>
            <p className="font-mono text-base font-bold text-card-foreground">{stats.sessionCount}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[10px] font-medium uppercase">Rating</span>
            </div>
            <p className="font-mono text-base font-bold text-card-foreground">
              {stats.avgScore ? `${stats.avgScore.toFixed(1)}★` : "—"}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-foreground" />
              <span className="text-[10px] font-medium uppercase">This Week</span>
            </div>
            <p className="font-mono text-base font-bold text-card-foreground">{stats.weekMinutes}m</p>
          </div>
        </div>

      </div>
    </section>
  );
}
