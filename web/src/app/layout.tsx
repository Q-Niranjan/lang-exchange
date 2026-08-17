import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { ReactNode } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "EngFluency — language practice with a real partner",
  description:
    "Match with a real partner for a live 1:1 language exchange. Free matching and ratings. Premium messaging.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <SiteHeader />
            <main>{children}</main>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
