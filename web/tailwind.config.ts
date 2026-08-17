import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ── design-system tokens (CSS-variable-driven) ── */
        background:           "hsl(var(--background))",
        foreground:           "hsl(var(--foreground))",
        card:                 "hsl(var(--card))",
        "card-foreground":    "hsl(var(--card-foreground))",
        popover:              "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary:              "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        secondary:            "hsl(var(--secondary))",
        "secondary-foreground":"hsl(var(--secondary-foreground))",
        muted:                "hsl(var(--muted))",
        "muted-foreground":   "hsl(var(--muted-foreground))",
        accent:               "hsl(var(--accent))",
        "accent-foreground":  "hsl(var(--accent-foreground))",
        destructive:          "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        border:               "hsl(var(--border))",
        input:                "hsl(var(--input))",
        ring:                 "hsl(var(--ring))",

        /* ── brand palette ── */
        "brand-900": "#0c1420",
        "brand-800": "#111d2d",
        "brand-700": "#162336",
        "brand-600": "#1e2e42",
        "brand-500": "#253347",
        "brand-400": "#3b5270",
        "brand-blue": "#3b82f6",
        "brand-blue-light": "#60a5fa",
        "brand-blue-dark": "#2563eb",

        /* ── practice page (dark immersive theme) ── */
        dusk:       "#1E2A44",
        duskSoft:   "#253652",
        duskSofter: "#2E4066",
        cream:      "#F6F1E4",
        creamEdge:  "#D9CFB8",
        navy:       "#22283B",
        coral:      "#E8637B",
        coralDark:  "#C94B62",
        amber:      "#F2B84B",
        "muted-ink":"#6B7280",

        /* ── legacy aliases ── */
        pine:       "#16A34A",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
        puente: ["var(--font-practice-sans)", "Inter", "ui-sans-serif", "system-ui"],
        fraunces: ["var(--font-practice-display)", "Fraunces", "Georgia", "serif"],
        jetbrains: ["var(--font-jetbrains)", "var(--font-practice-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        puente: "20px",
      },
      boxShadow: {
        card: "0 18px 40px -28px rgba(26, 23, 20, 0.45)",
        puente: "0 30px 60px -25px rgba(0, 0, 0, 0.55)",
        "blue-glow": "0 0 24px -6px rgba(59, 130, 246, 0.35)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pingRing: {
          "0%": { transform: "scale(0.55)", opacity: "0.7" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.38s ease both",
        pingRing: "pingRing 2.4s cubic-bezier(0.3, 0.6, 0.4, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
