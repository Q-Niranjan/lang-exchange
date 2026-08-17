"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, User, LogOut, Radio } from "lucide-react";

import { clearTokens, isLoggedIn } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isLoggedIn());
  }, [pathname]);

  function logout() {
    clearTokens();
    setAuthed(false);
    router.push("/");
  }

  if (pathname === "/app") return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm transition-transform group-hover:scale-105">
              <span>E</span>
            </div>
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-foreground">
              EngFluency
            </span>
          </Link>

          {/* Live Status Pill */}
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <Radio className="h-3.5 w-3.5" />
            <span>Live Practice Network</span>
          </div>
        </div>

        {/* Navigation & Theme Actions */}
        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {authed ? (
            <>
              <Link
                href="/app"
                className="flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Practice Studio</span>
                <span className="sm:hidden">Studio</span>
              </Link>
              <Link
                href="/app/profile"
                className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <User className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Profile</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span>Get started</span>
                <span>→</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
