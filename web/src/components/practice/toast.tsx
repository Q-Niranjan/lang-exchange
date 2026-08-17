"use client";

type Props = {
  message: string;
  visible: boolean;
};

export function PracticeToast({ message, visible }: Props) {
  return (
    <div
      className={`pointer-events-none fixed bottom-8 left-1/2 z-50 rounded-full border border-border bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-lg transition-all duration-300 ${
        visible ? "-translate-x-1/2 translate-y-0 opacity-100 scale-100" : "-translate-x-1/2 translate-y-4 opacity-0 scale-95"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>{message}</span>
      </div>
    </div>
  );
}
