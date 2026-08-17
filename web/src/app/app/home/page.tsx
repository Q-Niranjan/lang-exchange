"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Flame, Mic, Users } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState } from "@/components/app/empty-state";
import {
  api, MatchResult, SessionHistoryItem, User, UserStats,
} from "@/lib/api";
import { languageByCode } from "@/components/practice/languages";

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function HomePage() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const stats = useQuery({
    queryKey: ["my-stats"],
    queryFn: () => api<UserStats>("/api/v1/users/me/stats"),
  });

  const matchStatus = useQuery({
    queryKey: ["home-match-status"],
    queryFn: () => api<MatchResult>("/api/v1/practice/match/status"),
    refetchInterval: 10000,
    retry: false,
  });

  const sessions = useQuery({
    queryKey: ["my-sessions-recent"],
    queryFn: () => api<{ sessions: SessionHistoryItem[] }>("/api/v1/users/me/sessions?limit=5"),
  });

  if (me.isLoading || stats.isLoading) {
    return <LoadingState label="Loading your dashboard…" />;
  }

  const u = me.data!;
  const s = stats.data;
  const online = matchStatus.data?.stats?.online_partners ?? 0;
  const native = languageByCode(u.profile?.native_language ?? "en");
  const learning = languageByCode(u.profile?.learning_language ?? "es");
  const recent = sessions.data?.sessions?.slice(0, 3) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title={`Welcome back${u.username ? `, ${u.username.split(/[_\s]/)[0]}` : ""}`}
        description="Your language practice at a glance."
      />

      {/* Primary CTA */}
      <div className="mb-8 rounded-lg border border-border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Ready to practice?</p>
            <p className="text-sm text-muted-foreground">
              {online > 0
                ? `${online} partner${online === 1 ? "" : "s"} online now`
                : "Find a partner for a live voice session"}
            </p>
          </div>
          <Link
            href="/app/practice"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Start 1:1 Practice
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Progress stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Streak", value: `${s?.streak_days ?? 0} days`, icon: <Flame className="h-4 w-4" /> },
          { label: "Practice time", value: formatDuration(s?.total_talk_seconds ?? 0), icon: <Clock className="h-4 w-4" /> },
          { label: "Sessions", value: String(s?.session_count ?? 0), icon: <Mic className="h-4 w-4" /> },
          { label: "Level", value: s?.level ?? "Beginner", icon: <Users className="h-4 w-4" /> },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              {item.icon}
              {item.label}
            </div>
            <p className="text-lg font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Languages */}
      {(native || learning) && (
        <div className="mb-8 rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Your languages</p>
          <p className="text-sm text-foreground">
            {native?.flag} {native?.name} → {learning?.flag} {learning?.name}
          </p>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-foreground">Recent activity</h2>
        {sessions.isLoading ? (
          <LoadingState label="Loading activity…" />
        ) : recent.length === 0 ? (
          <EmptyState
            title="No sessions yet"
            description="Complete your first practice session to see activity here."
            action={
              <Link href="/app/practice" className="text-sm font-medium text-primary hover:underline">
                Start practicing
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {recent.map((sess) => (
              <li key={sess.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{sess.partner_username}</p>
                  <p className="text-xs text-muted-foreground">
                    {sess.duration_seconds > 0 ? formatDuration(sess.duration_seconds) : "Session"} · {formatRelative(sess.started_at)}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{sess.status}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
