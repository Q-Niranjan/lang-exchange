"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Sparkles, User, LogOut, Menu, X } from "lucide-react";

import { clearTokens, isLoggedIn } from "@/lib/auth";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing",  label: "Pricing"  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed,    setAuthed]    = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => { setAuthed(isLoggedIn()); }, [pathname]);
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function logout() {
    clearTokens();
    setAuthed(false);
    router.push("/");
  }

  if (pathname.startsWith("/app")) return null;

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled
            ? "border-b border-border bg-background/90 shadow-sm backdrop-blur-xl"
            : "border-b border-transparent bg-background/60 backdrop-blur-md"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

          {/* ── Left: Logo ── */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blue shadow-blue-glow transition-transform group-hover:scale-105">
              <span className="font-black text-white text-sm tracking-tighter">LX</span>
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-extrabold text-[15px] tracking-tight text-foreground">LangExchange</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">Practice. Fluently.</span>
            </div>
          </Link>

          {/* ── Centre: Nav (desktop) ── */}
          {!authed && (
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          )}

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-2">
            {authed ? (
              <>
                <Link
                  href="/app/home"
                  className="hidden sm:flex items-center gap-1.5 rounded-full bg-brand-blue px-4 py-1.5 text-xs font-bold text-white shadow-blue-glow hover:bg-brand-blue-dark transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Practice Studio
                </Link>
                <Link
                  href="/app/settings"
                  className="flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5 text-xs font-semibold hover:bg-secondary/80 transition-colors"
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
                  className="hidden sm:block rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-brand-blue px-4 py-2 text-xs font-bold text-white shadow-blue-glow hover:bg-brand-blue-dark transition-all active:scale-[0.97]"
                >
                  Start Free Trial
                </Link>
                {/* Mobile hamburger */}
                <button
                  type="button"
                  className="md:hidden flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Toggle menu"
                >
                  {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && !authed && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-4 space-y-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="h-px bg-border my-2" />
            <Link
              href="/login"
              className="block rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Log in
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
