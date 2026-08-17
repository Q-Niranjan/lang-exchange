"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, User as UserIcon, Globe, Sparkles, Star, Save, ShieldCheck } from "lucide-react";

import { api, ApiError, RatingSummary, User } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import { LANGUAGES, LEVELS, type Level } from "@/components/practice/languages";

const LEVEL_KEY = "puente_level";

export default function ProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [native, setNative] = useState("en");
  const [learning, setLearning] = useState("es");
  const [level, setLevel] = useState<Level>("Intermediate");
  const [bio, setBio] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    const stored = window.localStorage.getItem(LEVEL_KEY);
    if (stored && (LEVELS as readonly string[]).includes(stored)) {
      setLevel(stored as Level);
    }
    setReady(true);
  }, [router]);

  const me = useQuery({
    queryKey: ["me"],
    enabled: ready,
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  const rating = useQuery({
    queryKey: ["my-rating", me.data?.id],
    enabled: Boolean(me.data?.id),
    queryFn: () => api<RatingSummary>(`/api/v1/users/${me.data!.id}/rating`),
  });

  useEffect(() => {
    if (!me.data?.profile) return;
    if (me.data.profile.native_language) setNative(me.data.profile.native_language);
    if (me.data.profile.learning_language) setLearning(me.data.profile.learning_language);
    if (me.data.profile.bio) setBio(me.data.profile.bio);
  }, [me.data]);

  const updateProfile = useMutation({
    mutationFn: (data: { native_language: string; learning_language: string; bio?: string }) =>
      api<User>("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setSavedMessage("Profile and language preferences updated successfully!");
      setError("");
      void qc.invalidateQueries({ queryKey: ["me"] });
      setTimeout(() => setSavedMessage(""), 3500);
    },
    onError: (err: ApiError) => {
      setError(err.message || "Failed to update profile preferences.");
    },
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (native === learning) {
      setError("Native language and practice language must be different.");
      return;
    }
    updateProfile.mutate({
      native_language: native,
      learning_language: learning,
      bio,
    });
  }

  function handleLevelChange(next: Level) {
    setLevel(next);
    window.localStorage.setItem(LEVEL_KEY, next);
  }

  if (!ready || me.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-foreground font-mono">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span>Loading user profile…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 sm:px-6 py-8 space-y-6 text-foreground">
      {/* Header Navigation & Status Badge */}
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground hover:bg-accent transition-colors shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Studio</span>
        </Link>

        <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
          <span>Verified Profile</span>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm text-card-foreground space-y-6">
        
        {/* User Profile Banner */}
        <div className="flex items-center gap-4 pb-6 border-b border-border">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-extrabold shadow-sm">
            {me.data?.username ? me.data.username[0].toUpperCase() : <UserIcon className="h-7 w-7" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl sm:text-2xl text-card-foreground">{me.data?.username}</h1>
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Active Member
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {me.data?.created_at ? `Joined ${new Date(me.data.created_at).toLocaleDateString()}` : "Active Member"} ·{" "}
              <span className="text-foreground font-semibold inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                {rating.data?.avg_score ? `${rating.data.avg_score.toFixed(1)}★ (${rating.data.rating_count} reviews)` : "New Speaker"}
              </span>
            </p>
          </div>
        </div>

        {/* Notifications */}
        {savedMessage ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="h-4 w-4 shrink-0" />
            <span>{savedMessage}</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-2.5 rounded-lg bg-destructive/10 border border-destructive/30 p-3.5 text-xs font-bold text-destructive">
            <span>⚠️ {error}</span>
          </div>
        ) : null}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Language Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <Globe className="h-4 w-4" />
              <h2 className="font-extrabold text-base text-card-foreground">Language Exchange Preferences</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Set your languages once. Your settings are remembered across all matching sessions.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Native Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  I Speak (Native)
                </label>
                <select
                  value={native}
                  onChange={(e) => setNative(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={`native-${lang.code}`} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Practice Language */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  I Practice (Learning)
                </label>
                <select
                  value={learning}
                  onChange={(e) => setLearning(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-2.5 text-xs font-semibold text-foreground focus:border-ring focus:outline-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={`learning-${lang.code}`} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Proficiency Level */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4" />
              <h2 className="font-extrabold text-base text-card-foreground">Proficiency Level</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleLevelChange(item)}
                  className={`rounded-lg border py-2.5 text-xs font-bold transition-all ${
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

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Bio / Practice Goals (Optional)
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell partners a bit about yourself, interests, or fluency goals…"
              rows={3}
              className="w-full resize-none rounded-lg border border-input bg-background p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
            />
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary py-3.5 text-xs font-extrabold uppercase tracking-wider text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {updateProfile.isPending ? (
              <span>Saving Changes…</span>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Profile Preferences</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
