"use client";

import { useQuery } from "@tanstack/react-query";

import { PageHeader } from "@/components/app/page-header";
import { LoadingState } from "@/components/app/loading-state";
import { EmptyState } from "@/components/app/empty-state";
import { api, LeaderboardResponse, User } from "@/lib/api";

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function LeaderboardPage() {
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => api<LeaderboardResponse>("/api/v1/users/leaderboard?limit=50"),
  });

  if (me.isLoading || board.isLoading) return <LoadingState label="Loading leaderboard…" />;

  const u = me.data!;
  const entries = board.data?.entries ?? [];
  const myRank = board.data?.my_rank ?? 0;
  const myEntry = board.data?.my_entry;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PageHeader
        title="Leaderboard"
        description="Ranked by total practice time."
      />

      {/* Current user position */}
      {myEntry && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Your position</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {myRank > 0 ? myRank : "—"}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{u.username} (you)</p>
                <p className="text-xs text-muted-foreground">{myEntry.level}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">{formatDuration(myEntry.total_talk_seconds)}</p>
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          title="No rankings yet"
          description="Complete practice sessions to appear on the leaderboard."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium w-16">Rank</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Level</th>
                <th className="px-4 py-3 font-medium text-right">Practice time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => {
                const isMe = entry.user_id === u.id;
                return (
                  <tr
                    key={entry.user_id}
                    className={isMe ? "bg-primary/5" : undefined}
                  >
                    <td className="px-4 py-3 font-medium text-muted-foreground">{entry.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-foreground">
                          {entry.username[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">
                          {entry.username}{isMe ? " (you)" : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{entry.level}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {formatDuration(entry.total_talk_seconds)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
