// Client-side time formatting (mirrors src/shared/lib/time.ts formatRelative).

/** "just now", "12s ago", "5m ago", "3h ago", "2d ago" for an age in milliseconds. */
export function relativeTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
