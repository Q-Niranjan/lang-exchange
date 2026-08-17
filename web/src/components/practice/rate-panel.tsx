"use client";

import { useState } from "react";
import { Star, Send, CheckCircle2, MessageSquare, Phone, UserPlus, UserCheck } from "lucide-react";

import type { Partner, PracticeSession } from "@/lib/api";

import { displayName, focusRing, initials, languageLabel } from "./languages";
import { durationLabel } from "./time";

type Props = {
  session: PracticeSession;
  partner: Partner;
  submitting: boolean;
  error: string;
  isPremium?: boolean;
  callBusy?: boolean;
  onSubmit: (score: number, comment: string) => void;
  onSkip: () => void;
  onMessage?: () => void;
  onCallAgain?: () => void;
  isFriend?: boolean;
  addingFriend?: boolean;
  onAddFriend?: () => void;
};

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function RatePanel({
  session,
  partner,
  submitting,
  error,
  isPremium,
  callBusy,
  onSubmit,
  onSkip,
  onMessage,
  onCallAgain,
  isFriend,
  addingFriend,
  onAddFriend,
}: Props) {
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const name = displayName(partner.username);

  const display = hovered || score;

  return (
    <section className="animate-fadeUp motion-reduce:animate-none space-y-4">
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm text-card-foreground space-y-6">

        {/* Header / Session summary */}
        <div className="flex items-center gap-4 pb-5 border-b border-border">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-extrabold text-base shadow-sm">
            {initials(partner.username)}
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Session Completed</span>
            </div>
            <h1 className="font-extrabold text-lg sm:text-xl text-card-foreground mt-0.5">
              How was your chat with {name.split(" ")[0]}?
            </h1>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {durationLabel(session.started_at, session.ended_at)} · {languageLabel(partner.native_language)} · {shortId(partner.id)}
            </p>
          </div>
        </div>

        {/* Interactive Star Rating */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Rate Your Conversation Experience
          </label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setScore(n)}
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                className={`p-1 transition-all transform hover:scale-110 ${focusRing}`}
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    n <= display
                      ? "fill-amber-500 text-amber-500"
                      : "text-muted-foreground/40 hover:text-muted-foreground"
                  }`}
                />
              </button>
            ))}
          </div>
          {display > 0 ? (
            <p className="text-xs font-semibold text-foreground">
              {display === 1
                ? "Needs improvement"
                : display === 2
                ? "Okay"
                : display === 3
                ? "Good session"
                : display === 4
                ? "Great conversation!"
                : "Outstanding partner! ⭐"}
            </p>
          ) : null}
        </div>

        {/* Optional Comment */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Feedback (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share feedback on pronunciation, fluency, or friendliness…"
            rows={3}
            className={`w-full rounded-lg border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none ${focusRing}`}
          />
        </div>

        {/* Submit & Skip Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={submitting || score < 1}
            onClick={() => onSubmit(score, comment.trim())}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all ${focusRing}`}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                Submitting…
              </span>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Submit Rating</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSkip}
            className={`rounded-lg border border-border bg-secondary px-5 py-3 text-xs font-bold text-secondary-foreground hover:bg-secondary/80 transition-colors ${focusRing}`}
          >
            Skip
          </button>
        </div>

        {isPremium ? (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              disabled={addingFriend || isFriend}
              onClick={onAddFriend}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${focusRing} ${
                isFriend
                  ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {isFriend ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {isFriend ? `${name.split(" ")[0]} is on your friend list` : `Add ${name.split(" ")[0]} to friends`}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onMessage}
                className={`flex items-center justify-center gap-2 rounded-lg border border-border bg-background py-2.5 text-xs font-bold hover:bg-accent ${focusRing}`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Message
              </button>
              <button
                type="button"
                disabled={callBusy || !isFriend}
                onClick={onCallAgain}
                title={isFriend ? "Start another voice call" : "Add them as a friend first"}
                className={`flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 ${focusRing}`}
              >
                <Phone className="h-3.5 w-3.5" />
                Call again
              </button>
            </div>
          </div>
        ) : null}

      </div>

      <p className="text-center text-[11px] text-muted-foreground font-mono">
        Ratings keep the EngFluency community safe and high quality.
      </p>
    </section>
  );
}
