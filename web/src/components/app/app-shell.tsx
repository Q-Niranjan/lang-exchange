"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";

import { api, type User } from "@/lib/api";
import { clearTokens, isLoggedIn } from "@/lib/auth";
import { AppSidebar, AppMobileNav } from "./app-sidebar";
import { LoadingState } from "./loading-state";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

  const me = useQuery({
    queryKey: ["me"],
    enabled: ready,
    queryFn: () => api<User>("/api/v1/users/me"),
  });

  function logout() {
    clearTokens();
    router.push("/");
  }

  if (!ready || me.isLoading) {
    return (
      <div className={`${GeistSans.variable} ${GeistMono.variable} font-sans fixed inset-0 z-50 flex items-center justify-center bg-background`}>
        <LoadingState label="Loading…" />
      </div>
    );
  }

  const user = me.data!;

  return (
    <div className={`${GeistSans.variable} ${GeistMono.variable} font-sans fixed inset-0 z-50 flex overflow-hidden bg-background text-foreground`}>
      <AppSidebar user={user} onLogout={logout} />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/app/home" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground">LF</div>
            <span className="text-sm font-semibold">LangFluency</span>
          </Link>
          <Link
            href="/app/settings"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
          >
            {user.username?.[0]?.toUpperCase() ?? <UserIcon className="h-3.5 w-3.5" />}
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto pb-14 md:pb-0">
          {children}
        </main>
      </div>

      <AppMobileNav />
    </div>
  );
}
