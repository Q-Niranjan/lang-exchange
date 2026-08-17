import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

export default function PracticeLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${GeistSans.variable} ${GeistMono.variable} font-sans fixed inset-0 z-50 overflow-y-auto bg-background text-foreground selection:bg-primary selection:text-primary-foreground`}
    >
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  );
}
