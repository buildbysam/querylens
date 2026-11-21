import { cx } from "@/shared/lib/cx.js";
import { ICONS_DIR, PUBLIC_DIR } from "@/shared/views/assets.js";
import { raw } from "hono/html";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * every icon available to the UI. Each name is a file public/images/icons/<name>.svg:
 * NOTE: to add an icon, drop its .svg file in that folder and add its name here.
 */
export const ICON_NAMES = [
  "activity",
  "alert-triangle",
  "arrow-left",
  "arrow-right",
  "camera",
  "check",
  "check-circle",
  "chevron-down",
  "chevron-right",
  "clock",
  "copy",
  "database",
  "eye",
  "eye-off",
  "heart-pulse",
  "inbox",
  "info",
  "log-out",
  "menu",
  "plus",
  "refresh-cw",
  "search",
  "x",
  "x-circle",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** standard sizes */
export type IconSize = 14 | 16 | 20 | 24 | 32;

const ICON_MARKUP: ReadonlyMap<IconName, string> = new Map(
  ICON_NAMES.map((name) => {
    const file = join(PUBLIC_DIR, ICONS_DIR, `${name}.svg`);
    const svg = readFileSync(file, "utf8");
    const inner = /<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/.exec(svg)?.[1];
    if (inner === undefined) throw new Error(`Icon file is not a single <svg> element: ${file}`);
    return [name, inner.trim()];
  })
);

export interface IconProps {
  name: IconName;
  /** width & height in px. default 20. */
  size?: IconSize;
  class?: string;
  strokeWidth?: number;
  label?: string;
}

/** The single icon component: `<Icon name="database" size={16} />`. */
export function Icon({ name, size = 20, class: className, strokeWidth = 1.8, label }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      class={cx("shrink-0", className)}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": "true", focusable: "false" })}
    >
      {/* trusted markup from our own icon files, read at start-up */}
      {raw(ICON_MARKUP.get(name)!)}
    </svg>
  );
}
