/** "just now", "12s ago", "5m ago", "3h ago", "2d ago". */
export function formatRelative(date: Date | null | undefined, now: Date = new Date()): string {
  if (!date) return "never";
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Compact duration: "45s", "12m", "3h 4m", "5d 2h". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

/** UTC "YYYY-MM-DD HH:MM:SS". */
export function formatTimestamp(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/** Server-local "HH:MM:SS". */
export function formatClock(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

/** "{H}h {M}m" for process / service uptime. */
export function formatHoursMinutes(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

/** Whole seconds from now until `date` (never negative). */
export function secondsUntil(date: Date | null, now: Date = new Date()): number | null {
  return date ? Math.max(0, Math.round((date.getTime() - now.getTime()) / 1000)) : null;
}
