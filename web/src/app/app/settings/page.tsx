"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { LoadingState } from "@/components/app/loading-state";
import { useToast } from "@/components/app/toast-provider";
import { api, ApiError, User } from "@/lib/api";
import { LANGUAGES } from "@/components/practice/languages";

type Section = "personal" | "preferences";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [section, setSection] = useState<Section>("personal");
  const [country, setCountry] = useState("");
  const [native, setNative] = useState("en");
  const [learning, setLearning] = useState("es");
  const [bio, setBio] = useState("");
  const toast = useToast();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<User>("/api/v1/users/me"),
  });

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
      toast.success("Settings saved.");
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: ApiError) => toast.error(err.message || "Failed to save."),
  });

  if (me.isLoading) return <LoadingState />;

  const u = me.data!;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <PageHeader title="Settings" description="Manage your profile and app preferences." />

      {/* Section tabs */}
      <div className="mb-6 flex gap-1 rounded-md border border-border bg-card p-1">
        {([
          { id: "personal" as Section, label: "Personal Information" },
          { id: "preferences" as Section, label: "Preferences" },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSection(tab.id)}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              section === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {section === "personal" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Username</label>
            <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-mono">{u.username}</div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mobile number</label>
            <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-mono">{u.mobile_number}</div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gender</label>
            <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground capitalize">{u.gender}</div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. India, USA"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="button"
            disabled={updateProfile.isPending}
            onClick={() => updateProfile.mutate({ country: country || undefined })}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {section === "preferences" && (
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Native language</label>
              <select
                value={native}
                onChange={(e) => setNative(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {LANGUAGES.map((lang) => (
                  <option key={`n-${lang.code}`} value={lang.code}>{lang.flag} {lang.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Learning language</label>
              <select
                value={learning}
                onChange={(e) => setLearning(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {LANGUAGES.map((lang) => (
                  <option key={`l-${lang.code}`} value={lang.code}>{lang.flag} {lang.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bio / goals</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell partners about your goals…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Notifications</label>
            <p className="text-sm text-muted-foreground">Call and message notifications are enabled for premium members.</p>
          </div>
          <button
            type="button"
            disabled={updateProfile.isPending || native === learning}
            onClick={() => {
              if (native === learning) { toast.error("Languages must differ."); return; }
              updateProfile.mutate({ native_language: native, learning_language: learning, bio: bio || undefined });
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? "Saving…" : "Save preferences"}
          </button>
        </div>
      )}
    </div>
  );
}
