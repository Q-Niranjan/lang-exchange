export function formatElapsed(startedAt: string, now = Date.now()) {
  const ms = Math.max(0, now - new Date(startedAt).getTime());
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function formatSeconds(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function durationLabel(startedAt: string, endedAt?: string) {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const mins = Math.max(1, Math.round((end - new Date(startedAt).getTime()) / 60000));
  return `${mins}m practice`;
}
