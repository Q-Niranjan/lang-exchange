"use client";

import Link from "next/link";
import { User, LogOut, Settings, MessageSquare, Lock, Crown, Users } from "lucide-react";
import { focusRing } from "./languages";
import { NotificationBell } from "@/components/notifications/notification-bell";

type Props = {
  username: string;
  isPremium?: boolean;
  onOpenPremium?: () => void;
  onLogout: () => void;
};

export function PracticeHeader({ username, isPremium, onOpenPremium, onLogout }: Props) {
  return (
    <header className="mb-6 sm:mb-8 flex items-center justify-between rounded-xl border border-border bg-card p-3 pl-4 shadow-sm">
      {/* Brand */}
      <Link href="/app" className="flex items-center gap-2.5 group">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-sm transition-transform group-hover:scale-105">
          <span>E</span>
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-card-foreground group-hover:text-primary transition-colors">
            EngFluency
          </span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase">Practice Studio</span>
        </div>
      </Link>

      {/* Nav Actions & User Chips */}
      <div className="flex items-center gap-2">
        <NotificationBell enabled={Boolean(isPremium)} onLocked={onOpenPremium} />
        {/* Chat / Premium Feature Trigger */}
        {isPremium ? (
          <>
            <Link
              href="/app/friends"
              title="Friend list and call again"
              className={`flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-all ${focusRing}`}
            >
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-bold">Friends</span>
            </Link>
            <Link
              href="/app/chat"
              title="Text chat with partners"
              className={`flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-all ${focusRing}`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline font-bold">Chat</span>
              <Crown className="h-3 w-3 text-amber-500 ml-0.5" />
            </Link>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onOpenPremium?.()}
            title="Friends, chat, and call-again are Premium"
            className={`flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-all ${focusRing}`}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline font-bold">Friends</span>
            <Lock className="h-3 w-3 text-muted-foreground ml-0.5" />
          </button>
        )}

        {/* Profile & Settings Link */}
        <Link
          href="/app/profile"
          title="Profile & Settings"
          className={`flex items-center gap-1.5 rounded-full border border-border bg-primary/10 px-3 py-1.5 text-xs font-bold text-foreground hover:bg-primary/20 transition-all ${focusRing}`}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-3 w-3" />
          </div>
          <span className="max-w-[90px] sm:max-w-[130px] truncate">{username || "Profile"}</span>
          <Settings className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </Link>

        {/* Sign Out */}
        <button
          type="button"
          onClick={onLogout}
          title="Sign out"
          className={`flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-all ${focusRing}`}
        >
          <LogOut className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
}
