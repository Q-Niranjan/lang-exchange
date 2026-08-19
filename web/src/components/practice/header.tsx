"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LogOut, MessageSquare, Users, Crown, Lock,
  CreditCard, Mic, User, Bell,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { PRACTICE_PARTNER_LABEL } from "@/lib/labels";

export type SidebarTab = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

type Props = {
  username: string;
  isPremium?: boolean;
  onOpenPremium?: () => void;
  onLogout: () => void;
  /** Profile page passes its tabs here so they render inside the app sidebar */
  profileTabs?: SidebarTab[];
  activeProfileTab?: string;
  onProfileTab?: (id: string) => void;
};

function NavItem({
  href, icon, label, active, locked, onLocked, badge, onClick,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  locked?: boolean;
  onLocked?: () => void;
  badge?: string;
  onClick?: () => void;
}) {
  const base = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all";
  const activeClass = "bg-brand-blue text-white shadow-blue-glow";
  const inactiveClass = "text-muted-foreground hover:text-foreground hover:bg-secondary";

  if (locked) {
    return (
      <button type="button" onClick={onLocked} className={`${base} ${inactiveClass}`}>
        {icon}
        <span>{label}</span>
        <Lock className="ml-auto h-3 w-3 opacity-40" />
      </button>
    );
  }

  if (onClick || !href) {
    return (
      <button type="button" onClick={onClick} className={`${base} ${active ? activeClass : inactiveClass}`}>
        {icon}
        <span>{label}</span>
        {badge && (
          <span className="ml-auto rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-400">
            {badge}
          </span>
        )}
      </button>
    );
  }

  return (
    <Link href={href} className={`${base} ${active ? activeClass : inactiveClass}`}>
      {icon}
      <span>{label}</span>
      {badge && (
        <span className="ml-auto rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-400">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function PracticeHeader({
  username, isPremium, onOpenPremium, onLogout,
  profileTabs, activeProfileTab, onProfileTab,
}: Props) {
  const pathname = usePathname();
  const isOnProfile = pathname.startsWith("/app/profile");

  return (
    <>
      {/* ─────────────────────────────────────────
          DESKTOP: left sidebar
      ───────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card/70 backdrop-blur-xl">

        {/* Brand */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue shadow-blue-glow">
            <span className="font-black text-white text-[13px] tracking-tight">LX</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-sm text-foreground">LangExchange</span>
            <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
              Practice Studio
            </span>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <NavItem
            href="/app"
            icon={<Mic className="h-4 w-4 shrink-0" />}
            label={PRACTICE_PARTNER_LABEL}
            active={pathname === "/app"}
          />
          <NavItem
            href="/app/friends"
            icon={<Users className="h-4 w-4 shrink-0" />}
            label="Friends"
            active={pathname.startsWith("/app/friends")}
            locked={!isPremium}
            onLocked={onOpenPremium}
          />
          <NavItem
            href="/app/chat"
            icon={<MessageSquare className="h-4 w-4 shrink-0" />}
            label="Chat"
            active={pathname.startsWith("/app/chat")}
            locked={!isPremium}
            onLocked={onOpenPremium}
          />

          {/* Billing */}
          <div className="mt-3 border-t border-border pt-3 space-y-0.5">
            <NavItem
              href="/app/billing"
              icon={isPremium ? <CreditCard className="h-4 w-4 shrink-0" /> : <Crown className="h-4 w-4 shrink-0" />}
              label={isPremium ? "My Plan" : "Upgrade"}
              active={pathname.startsWith("/app/billing")}
              badge={!isPremium ? "PRO" : undefined}
            />
          </div>

          {/* Profile sub-nav — shown when on profile page */}
          {isOnProfile && profileTabs && profileTabs.length > 0 && (
            <div className="mt-3 border-t border-border pt-3 space-y-0.5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                My Profile
              </p>
              {profileTabs.map((t) => (
                <NavItem
                  key={t.id}
                  icon={t.icon}
                  label={t.label}
                  active={activeProfileTab === t.id}
                  onClick={() => onProfileTab?.(t.id)}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Bottom: user row + logout */}
        <div className="border-t border-border p-3 space-y-0.5">
          {/* User row — avatar, username, notification bell */}
          <Link
            href="/app/profile"
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all ${
              isOnProfile
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white text-[11px] font-black">
              {username?.[0]?.toUpperCase() ?? <User className="h-3 w-3" />}
            </div>
            <span className="flex-1 truncate text-sm font-semibold">{username || "Profile"}</span>
            {/* Bell tucked into user row */}
            <span onClick={(e) => e.preventDefault()} className="shrink-0">
              <NotificationBell
                enabled={Boolean(isPremium)}
                onLocked={onOpenPremium}
                popupClass="left-full bottom-0 ml-3"
              />
            </span>
          </Link>

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────
          MOBILE: slim top bar
      ───────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 w-full border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="flex h-13 items-center justify-between px-4 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue shadow-blue-glow">
              <span className="font-black text-white text-[10px]">LX</span>
            </div>
            <span className="font-extrabold text-sm text-foreground">LangExchange</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell enabled={Boolean(isPremium)} onLocked={onOpenPremium} />
            <Link
              href="/app/profile"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue text-white text-[10px] font-black"
            >
              {username?.[0]?.toUpperCase()}
            </Link>
          </div>
        </div>

        {/* Mobile profile sub-tabs (shown only on profile page) */}
        {isOnProfile && profileTabs && profileTabs.length > 0 && (
          <div className="flex gap-1 border-t border-border px-3 pb-2 pt-1 overflow-x-auto scrollbar-none">
            {profileTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onProfileTab?.(t.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  activeProfileTab === t.id
                    ? "bg-brand-blue text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────
          MOBILE: bottom tab bar
      ───────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 border-t border-border bg-card/95 backdrop-blur-xl">
        {([
          {
            href: "/app",
            icon: <Mic className="h-5 w-5" />,
            label: "Call",
            match: (p: string) => p === "/app",
          },
          {
            href: isPremium ? "/app/friends" : undefined,
            icon: <Users className="h-5 w-5" />,
            label: "Friends",
            match: (p: string) => p.startsWith("/app/friends"),
            locked: !isPremium,
          },
          {
            href: isPremium ? "/app/chat" : undefined,
            icon: <MessageSquare className="h-5 w-5" />,
            label: "Chat",
            match: (p: string) => p.startsWith("/app/chat"),
            locked: !isPremium,
          },
          {
            href: "/app/profile",
            icon: <User className="h-5 w-5" />,
            label: "Profile",
            match: (p: string) => p.startsWith("/app/profile"),
          },
        ] as Array<{
          href?: string;
          icon: React.ReactNode;
          label: string;
          match: (p: string) => boolean;
          locked?: boolean;
        }>).map(({ href, icon, label, match, locked }) => {
          const isActive = match(pathname);
          const cls = `flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors ${
            isActive ? "text-brand-blue-light" : "text-muted-foreground"
          }`;

          if (locked || !href) {
            return (
              <button key={label} type="button" onClick={onOpenPremium} className={cls}>
                {icon}
                <span>{label}</span>
              </button>
            );
          }

          return (
            <Link key={href} href={href} className={cls}>
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Bell icon in mobile bottom bar */}
        <div className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold text-muted-foreground`}>
          {isPremium
            ? <NotificationBell enabled popupClass="right-0 bottom-full mb-2" />
            : <button type="button" onClick={onOpenPremium}><Bell className="h-5 w-5" /></button>
          }
          <span>Alerts</span>
        </div>
      </nav>
    </>
  );
}
