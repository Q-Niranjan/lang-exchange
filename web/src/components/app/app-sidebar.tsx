"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, Mic, Users, MessageSquare, CreditCard, Settings, Trophy, LogOut, User,
} from "lucide-react";

import type { User as AppUser } from "@/lib/api";

const NAV = [
  { href: "/app/home", label: "Home", icon: Home, match: (p: string) => p === "/app/home" || p === "/app" },
  { href: "/app/practice", label: "1:1 Practice", icon: Mic, match: (p: string) => p.startsWith("/app/practice") },
  { href: "/app/friends", label: "Friends", icon: Users, match: (p: string) => p.startsWith("/app/friends") },
  { href: "/app/chat", label: "Chat", icon: MessageSquare, match: (p: string) => p.startsWith("/app/chat") },
  { href: "/app/plan", label: "Plan", icon: CreditCard, match: (p: string) => p.startsWith("/app/plan") || p.startsWith("/app/billing") },
  { href: "/app/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/app/settings") || p.startsWith("/app/profile") },
  { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy, match: (p: string) => p.startsWith("/app/leaderboard") },
] as const;

type Props = {
  user: AppUser;
  onLogout: () => void;
};

export function AppSidebar({ user, onLogout }: Props) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          LF
        </div>
        <span className="text-sm font-semibold text-foreground">LangFluency</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3 space-y-0.5">
        <Link
          href="/app/settings"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {user.username?.[0]?.toUpperCase() ?? <User className="h-3.5 w-3.5" />}
          </div>
          <span className="truncate">{user.username}</span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

/** Mobile bottom nav — same routes */
export function AppMobileNav() {
  const pathname = usePathname();
  const items = NAV.slice(0, 5); // Home, Practice, Friends, Chat, Plan on mobile

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-14 border-t border-border bg-card">
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
