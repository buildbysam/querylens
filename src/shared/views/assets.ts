/**
 * Client-side assets served from public/ (module layout: docs/07-web.md §7.4).
 * Layouts load APP_SCRIPT on every page plus at most one page entry from PAGE_SCRIPTS.
 */

/** Shared components, toast store and Alpine start-up. */
export const APP_SCRIPT = "/js/app.js";

/** One ES-module entry per page; each registers that page's Alpine component(s). */
export const PAGE_SCRIPTS = {
  login: "/js/pages/login.js",
  databases: "/js/pages/databases.js",
  snapshots: "/js/pages/snapshots.js",
  health: "/js/pages/health.js",
  error: "/js/pages/error.js",
} as const;

export type PageScript = (typeof PAGE_SCRIPTS)[keyof typeof PAGE_SCRIPTS];

/** Modules fetched by every page, preloaded so the import graph doesn't load serially. */
export const PRELOAD_MODULES = ["/js/vendor/alpine.js", "/js/lib/dom.js", "/js/lib/http.js"] as const;

/**
 * `x-data` expression calling a registered Alpine component with server-provided options,
 * e.g. `alpineData("healthPage", { refreshSeconds: 30 })` → `healthPage({"refreshSeconds":30})`.
 * Hono escapes the attribute value, so any JSON is safe here.
 */
export function alpineData(component: string, ...args: unknown[]): string {
  return `${component}(${args.map((arg) => JSON.stringify(arg)).join(", ")})`;
}
