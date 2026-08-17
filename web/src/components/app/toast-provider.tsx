"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const STYLES: Record<ToastType, { bar: string; icon: string }> = {
  success: {
    bar: "border-emerald-500/30 bg-card",
    icon: "text-emerald-500",
  },
  error: {
    bar: "border-destructive/30 bg-card",
    icon: "text-destructive",
  },
  info: {
    bar: "border-primary/30 bg-card",
    icon: "text-primary",
  },
};

function ToastIcon({ type }: { type: ToastType }) {
  const cls = `h-4 w-4 shrink-0 ${STYLES[type].icon}`;
  if (type === "success") return <CheckCircle2 className={cls} />;
  if (type === "error") return <AlertCircle className={cls} />;
  return <Info className={cls} />;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, type: ToastType) => {
      const trimmed = message.trim();
      if (!trimmed) return;

      const id = crypto.randomUUID();
      setToasts((prev) => [...prev.slice(-2), { id, message: trimmed, type }]);

      const timer = setTimeout(() => dismiss(id), 6000);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => push(message, "success"),
      error: (message) => push(message, "error"),
      info: (message) => push(message, "info"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Bottom-right sticky toast stack */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-20 right-4 z-[200] flex w-[min(calc(100vw-2rem),22rem)] flex-col gap-2 md:bottom-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${STYLES[t.type].bar}`}
          >
            <ToastIcon type={t.type} />
            <p className="flex-1 text-sm font-medium leading-snug text-foreground">
              {t.message}
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
