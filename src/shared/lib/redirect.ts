export const DEFAULT_AFTER_LOGIN = "/app/databases";

/**
 * Accepts only same-origin relative paths for post-login redirects (no open redirects),
 * and never sends the user back to the sign-in flow itself.
 */
export function safeNext(raw: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 2048) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(raw)) return fallback;
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/auth/")) return fallback;
  return raw;
}

/** /login URL carrying the page to return to. */
export function loginUrl(next: string) {
  return next === DEFAULT_AFTER_LOGIN ? "/login" : `/login?next=${encodeURIComponent(next)}`;
}
