"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, MessageSquare, Phone, PhoneOff, X } from "lucide-react";

import { api, ApiError, type MatchResult, type Partner } from "@/lib/api";
import { displayName, focusRing, initials } from "@/components/practice/languages";

export type NotificationItem = {
  id: string;
  type: "incoming_call" | "missed_call" | "message";
  partner?: Partner;
  session_id?: string;
  conversation_id?: string;
  preview?: string;
  created_at: string;
  online: boolean;
};

type Feed = {
  items: NotificationItem[];
  unread_count: number;
};

type Props = {
  enabled: boolean;
  onLocked?: () => void;
};

export function NotificationBell({ enabled, onLocked }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const feed = useQuery({
    queryKey: ["notifications"],
    enabled,
    queryFn: () => api<Feed>("/api/v1/notifications"),
    refetchInterval: open ? 3000 : 5000,
  });

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items = feed.data?.items ?? [];
  const count = feed.data?.unread_count ?? items.length;

  async function dismiss(id: string) {
    setBusy(id);
    try {
      await api("/api/v1/notifications/dismiss", { method: "POST", body: JSON.stringify({ id }) });
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    } catch {
      /* keep item */
    } finally {
      setBusy("");
    }
  }

  async function accept(item: NotificationItem) {
    if (!item.session_id) return;
    setBusy(item.id);
    try {
      await api<MatchResult>(`/api/v1/practice/${item.session_id}/accept`, { method: "POST" });
      setOpen(false);
      router.push("/app");
    } catch (err) {
      console.warn((err as ApiError).message);
    } finally {
      setBusy("");
    }
  }

  async function callBack(item: NotificationItem) {
    if (!item.partner?.id) return;
    setBusy(item.id);
    try {
      await api<MatchResult>("/api/v1/practice/direct", {
        method: "POST",
        body: JSON.stringify({ partner_id: item.partner.id }),
      });
      await dismiss(item.id);
      setOpen(false);
      router.push("/app");
    } catch {
      setBusy("");
    }
  }

  function openMessage(item: NotificationItem) {
    void dismiss(item.id);
    setOpen(false);
    router.push("/app/chat");
  }

  if (!enabled) {
    return (
      <button
        type="button"
        onClick={() => onLocked?.()}
        title="Notifications are a Premium feature"
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent ${focusRing}`}
      >
        <Bell className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Call and message notifications"
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent ${focusRing}`}
      >
        <Bell className="h-3.5 w-3.5" />
        {count > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-[10px] font-extrabold text-destructive-foreground flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(calc(100vw-2rem),22rem)] rounded-xl border border-border bg-card shadow-lg overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="text-xs font-extrabold">Notifications</div>
            <div className="text-[10px] text-muted-foreground">Calls & messages stay until you act</div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id} className="p-3 space-y-2">
                    <div className="flex items-start gap-2.5">
                      <div className="relative mt-0.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-[10px] font-extrabold">
                          {initials(item.partner?.username ?? "P")}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card ${item.online ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold">
                          {item.type === "message" ? <MessageSquare className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                          <span className="truncate">{displayName(item.partner?.username ?? "Partner")}</span>
                          {item.online ? <span className="text-emerald-600 dark:text-emerald-400 font-semibold">still here</span> : null}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{item.preview}</p>
                      </div>
                      <button
                        type="button"
                        title="Dismiss"
                        disabled={busy === item.id}
                        onClick={() => void dismiss(item.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      {item.type === "incoming_call" ? (
                        <>
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => void accept(item)}
                            className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => void dismiss(item.id)}
                            className="flex items-center justify-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-bold hover:bg-accent disabled:opacity-50"
                          >
                            <PhoneOff className="h-3 w-3" />
                            Decline
                          </button>
                        </>
                      ) : null}
                      {item.type === "missed_call" ? (
                        <button
                          type="button"
                          disabled={Boolean(busy) || !item.online || !item.partner?.id}
                          title={item.online ? "Call them again" : "They left — notification stays until you dismiss it"}
                          onClick={() => void callBack(item)}
                          className="flex-1 rounded-lg bg-emerald-600 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                        >
                          {item.online ? "Call again" : "Waiting for them"}
                        </button>
                      ) : null}
                      {item.type === "message" ? (
                        <button
                          type="button"
                          onClick={() => openMessage(item)}
                          className="flex-1 rounded-lg border border-border py-1.5 text-[11px] font-bold hover:bg-accent"
                        >
                          Open chat
                        </button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
