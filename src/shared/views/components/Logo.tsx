import { APP_NAME } from "@/shared/lib/app-info.js";
import { cx } from "@/shared/lib/cx.js";

export interface LogoMarkProps {
  size?: 24 | 32;
  class?: string;
}

/** geometric mark: a vertical orange beam capped by a dot. The only custom SVG allowed. */
export function LogoMark({ size = 32, class: className }: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      class={cx("text-accent shrink-0", className)}
    >
      <circle cx="16" cy="6" r="4" />
      <rect x="13" y="12" width="6" height="18" rx="3" />
    </svg>
  );
}

export interface LogoProps {
  /** 24px mark + 16px wordmark (shell / error pages) or 32px mark + 20px wordmark (login). */
  size?: "sm" | "lg";
  href?: string;
  class?: string;
}

export function Logo({ size = "sm", href, class: className }: LogoProps) {
  const content = (
    <>
      <LogoMark size={size === "lg" ? 32 : 24} />
      <span class={cx("text-fg font-semibold", size === "lg" ? "text-lg" : "text-md")}>{APP_NAME}</span>
    </>
  );
  const classes = cx("inline-flex items-center", size === "lg" ? "gap-4" : "gap-2", className);

  return href ? (
    <a href={href} class={cx(classes, "rounded-lg")} aria-label={`${APP_NAME} home`}>
      {content}
    </a>
  ) : (
    <span class={classes}>{content}</span>
  );
}
