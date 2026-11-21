/**
 * every static asset the UI uses — the single source for public paths.
 */
import { config } from "@/config.js";

/* --- servings --- */
export const PUBLIC_DIR = config.isProduction ? "./dist/public" : "./public";
export const STATIC_DIRS = ["css", "js", "images", "favicon"] as const;

/* --- styles --- */

export const STYLESHEET = "/css/styles.css";
export const FONTS_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap";

/* --- images --- */

/** logo
 * webp preferred, png fallback
 */
export const LOGO_WEBP = "/images/querylens.webp";
export const LOGO_PNG = "/images/querylens.png";

export const ICONS_DIR = "images/icons";

export const FAVICON = "/favicon/favicon.png";

/* --- scripts --- */

/** shared components, toast store and alpine start-up */
export const APP_SCRIPT = "/js/app.js";

/** one ES-module entry per page */
export const PAGE_SCRIPTS = {
  login: "/js/pages/login.js",
  databases: "/js/pages/databases.js",
  snapshots: "/js/pages/snapshots.js",
  health: "/js/pages/health.js",
  error: "/js/pages/error.js",
} as const;

export type PageScript = (typeof PAGE_SCRIPTS)[keyof typeof PAGE_SCRIPTS];

/** modules fetched by every page, preloaded so import graph doesn't load serially. */
export const PRELOAD_MODULES = ["/js/vendor/alpine.js", "/js/lib/dom.js", "/js/lib/http.js"] as const;

/**
 * `x-data` expression calling a registered Alpine component with server-provided options,
 * e.g. `alpineData("healthPage", { refreshSeconds: 30 })` → `healthPage({"refreshSeconds":30})`.
 * NOTE: hono escapes the attribute value, so any JSON is safe here.
 */
export function alpineData(component: string, ...args: unknown[]): string {
  return `${component}(${args.map((arg) => JSON.stringify(arg)).join(", ")})`;
}
