"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Check, Star, Save, Globe, User as UserIcon,
  Flame, Trophy, Clock, Phone, CreditCard, Calendar,
  ChevronRight, Mic,
} from "lucide-react";

import {
  api, ApiError, RatingSummary, SessionHistoryItem, User, UserStats,
} from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { LANGUAGES, languageByCode } from "@/components/practice/languages";

type Tab = "overview" | "personal" | "preferences" | "history";

const LEVEL_COLORS: Record<string, string> = {
  "Beginner":          "bg-slate-500/20 text-slate-300",
  "Elementary":        "bg-green-500/20 text-green-400",
  "Intermediate":      "bg-blue-500/20 text-blue-400",
  "Upper-Intermediate":"bg-purple-500/20 text-purple-400",
  "Advanced":          "bg-amber-500/20 text-amber-400",
};

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function trialDaysLeft(premiumUntil?: string): number | null {
  if (!premiumUntil) return null;
  const diff = new Date(premiumUntil).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");

  // Personal form
  const [country, setCountry] = useState("");
  // Preferences form
  const [native, setNative] = useState("en");
  const [learning, setLearning] = useState("es");
  const [bio, setBio] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return; }
    setReady(true);
  }, [router]);

  const me = useQuery({
    queryKey: ["me"],
    enabled: ready,
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const stats = useQuery({
    queryKey: ["my-stats"],
    enabled: ready,
    queryFn: () => api<UserStats>("/api/v1/users/me/stats"),
  });

  const rating = useQuery({
    queryKey: ["my-rating", me.data?.id],
    enabled: Boolean(me.data?.id),
    queryFn: () => api<RatingSummary>(`/api/v1/users/${me.data!.id}/rating`),
  });

  const sessions = useQuery({
    queryKey: ["my-sessions"],
    enabled: ready && tab === "history",
    queryFn: () => api<{ sessions: SessionHistoryItem[] }>("/api/v1/users/me/sessions"),
  });

  // Populate form fields from API data
  useEffect(() => {
    if (!me.data?.profile) return;
    if (me.data.profile.native_language) setNative(me.data.profile.native_language);
    if (me.data.profile.learning_language) setLearning(me.data.profile.learning_language);
    if (me.data.profile.bio) setBio(me.data.profile.bio);
    if (me.data.profile.country) setCountry(me.data.profile.country);
  }, [me.data]);

  const updateProfile = useMutation({
    mutationFn: (data: { native_language?: string; learning_language?: string; bio?: string; country?: string }) =>
      api<User>("/api/v1/users/me", { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => {
      setSavedMsg("Profile updated.");
      setError("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      setTimeout(() => setSavedMsg(""), 3000);
    },
    onError: (err: ApiError) => setError(err.message || "Failed to update."),
  });

  if (!ready || me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-foreground">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm">Loading profile…</span>
        </div>
      </div>
    );
  }

  const u = me.data!;
  const s = stats.data;
  const daysLeft = trialDaysLeft(u.premium_until);
  const levelColor = LEVEL_COLORS[s?.level ?? "Beginner"] ?? LEVEL_COLORS["Beginner"];

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview",    label: "Overview" },
    { id: "personal",    label: "Personal" },
    { id: "preferences", label: "Preferences" },
    { id: "history",     label: "History" },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 py-8 space-y-6 text-foreground animate-fadeUp">

      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Practice
        </Link>
        <Link
          href="/app/billing"
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/30 bg-brand-blue/10 px-3.5 py-1.5 text-xs font-semibold text-brand-blue-light hover:bg-brand-blue/20 transition-colors"
        >
          <CreditCard className="h-3.5 w-3.5" />
          {daysLeft !== null ? `${daysLeft} days left` : "Billing"}
        </Link>
      </div>

      {/* Profile banner */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white text-xl font-extrabold shadow-blue-glow">
            {u.username?.[0]?.toUpperCase() ?? <UserIcon className="h-7 w-7" />}
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-extrabold text-xl text-foreground">{u.username}</h1>
              {s?.level && (
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${levelColor}`}>
                  {s.level}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {u.profile?.country ? `${u.profile.country} · ` : ""}
              Joined {new Date(u.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              {rating.data && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                  {rating.data.avg_score.toFixed(1)} ({rating.data.rating_count} reviews)
                </span>
              )}
              {u.profile?.native_language && (
                <span className="text-xs text-muted-foreground">
                  {languageByCode(u.profile.native_language)?.flag} {languageByCode(u.profile.native_language)?.name}
                  {u.profile.learning_language && (
                    <> → {languageByCode(u.profile.learning_language)?.flag} {languageByCode(u.profile.learning_language)?.name}</>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              tab === t.id
                ? "bg-brand-blue text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div className="space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: <Mic className="h-4 w-4 text-brand-blue-light" />, label: "Sessions", value: String(s?.session_count ?? 0) },
              { icon: <Clock className="h-4 w-4 text-brand-blue-light" />, label: "Talk Time", value: formatDuration(s?.total_talk_seconds ?? 0) },
              { icon: <Flame className="h-4 w-4 text-orange-400" />, label: "Streak", value: `${s?.streak_days ?? 0} days` },
              { icon: <Trophy className="h-4 w-4 text-amber-400" />, label: "Level", value: s?.level ?? "Beginner" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {stat.icon}
                  {stat.label}
                </div>
                <p className="font-extrabold text-lg text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Level progress */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground">Level Progress</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${levelColor}`}>
                {s?.level ?? "Beginner"}
              </span>
            </div>
            <div className="space-y-1">
              {[
                { label: "Beginner",          min: 0,    max: 7200 },
                { label: "Elementary",        min: 7200, max: 36000 },
                { label: "Intermediate",      min: 36000, max: 108000 },
                { label: "Upper-Intermediate",min: 108000, max: 360000 },
                { label: "Advanced",          min: 360000, max: 360000 },
              ].map((lvl) => {
                const total = s?.total_talk_seconds ?? 0;
                const progress = lvl.max === 360000
                  ? Math.min(100, (total / 360000) * 100)
                  : Math.min(100, Math.max(0, ((total - lvl.min) / (lvl.max - lvl.min)) * 100));
                const active = (s?.level ?? "Beginner") === lvl.label;
                return (
                  <div key={lvl.label} className="flex items-center gap-3">
                    <span className={`text-[10px] w-28 shrink-0 font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {lvl.label}
                    </span>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${active ? "bg-brand-blue" : "bg-muted-foreground/30"}`}
                        style={{ width: `${active ? progress : (total >= lvl.max ? 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Streak card */}
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/15 text-2xl">
              🔥
            </div>
            <div className="flex-1">
              <p className="font-extrabold text-lg text-foreground">{s?.streak_days ?? 0} day streak</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {s?.streak_days === 0
                  ? "Start your streak — practice today!"
                  : "Keep it up! Practice daily to grow your streak."}
              </p>
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Link href="/app/friends" className="flex items-center justify-between p-4 hover:bg-secondary transition-colors">
              <span className="text-sm font-semibold">My Friends</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <div className="border-t border-border" />
            <button type="button" onClick={() => setTab("history")} className="w-full flex items-center justify-between p-4 hover:bg-secondary transition-colors">
              <span className="text-sm font-semibold">Call History</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="border-t border-border" />
            <Link href="/app/billing" className="flex items-center justify-between p-4 hover:bg-secondary transition-colors">
              <span className="text-sm font-semibold">Billing & Plan</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Personal Details ── */}
      {tab === "personal" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-extrabold text-base text-foreground">Personal Details</h2>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</label>
              <div className="rounded-lg border border-input bg-muted p-2.5 text-sm text-muted-foreground font-mono">
                {u.username}
              </div>
              <p className="text-[11px] text-muted-foreground">Username cannot be changed.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mobile Number</label>
              <div className="rounded-lg border border-input bg-muted p-2.5 text-sm text-muted-foreground font-mono">
                {u.mobile_number}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gender</label>
              <div className="rounded-lg border border-input bg-muted p-2.5 text-sm text-muted-foreground capitalize">
                {u.gender}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. India, USA, Japan"
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
              />
            </div>
          </div>

          {savedMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />{savedMsg}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs font-bold text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={updateProfile.isPending}
            onClick={() => updateProfile.mutate({ country: country || undefined })}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand-blue py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-blue-glow hover:bg-brand-blue-dark disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? "Saving…" : "Save Personal Details"}
          </button>
        </div>
      )}

      {/* ── Preferences ── */}
      {tab === "preferences" && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-extrabold text-base text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-blue-light" />
            Language Preferences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">I Speak (Native)</label>
              <select
                value={native}
                onChange={(e) => setNative(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm font-semibold text-foreground focus:border-ring focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={`native-${lang.code}`} value={lang.code}>{lang.flag} {lang.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">I Practice (Learning)</label>
              <select
                value={learning}
                onChange={(e) => setLearning(e.target.value)}
                className="w-full rounded-lg border border-input bg-background p-2.5 text-sm font-semibold text-foreground focus:border-ring focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={`learning-${lang.code}`} value={lang.code}>{lang.flag} {lang.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bio / Goals (Optional)</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell partners about yourself, your goals…"
              className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>

          {savedMsg && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs font-bold text-emerald-400">
              <Check className="h-4 w-4 shrink-0" />{savedMsg}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs font-bold text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={updateProfile.isPending || native === learning}
            onClick={() => {
              if (native === learning) { setError("Languages must differ."); return; }
              updateProfile.mutate({ native_language: native, learning_language: learning, bio: bio || undefined });
            }}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-brand-blue py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-blue-glow hover:bg-brand-blue-dark disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? "Saving…" : "Save Preferences"}
          </button>
        </div>
      )}

      {/* ── History ── */}
      {tab === "history" && (
        <div className="space-y-3">
          <h2 className="font-extrabold text-base text-foreground px-1">Call History</h2>
          {sessions.isLoading && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!sessions.isLoading && (sessions.data?.sessions?.length ?? 0) === 0 && (
            <div className="rounded-xl border border-border bg-card p-8 text-center space-y-2">
              <Phone className="h-6 w-6 mx-auto text-muted-foreground" />
              <p className="text-sm font-semibold">No sessions yet</p>
              <p className="text-xs text-muted-foreground">Your completed practice calls will appear here.</p>
            </div>
          )}
          {(sessions.data?.sessions ?? []).map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/15 text-brand-blue-light font-extrabold text-sm">
                {s.partner_username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{s.partner_username}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(s.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  {s.duration_seconds > 0 && ` · ${formatDuration(s.duration_seconds)}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className={`text-[10px] font-bold uppercase rounded-full px-2 py-0.5 ${
                  s.status === "ended" ? "bg-emerald-500/15 text-emerald-400" : "bg-muted text-muted-foreground"
                }`}>
                  {s.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
