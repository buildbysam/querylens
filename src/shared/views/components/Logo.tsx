import { APP_NAME } from "@/shared/lib/app-info.js";
import { cx } from "@/shared/lib/cx.js";
import { LOGO_PNG, LOGO_WEBP } from "@/shared/views/assets.js";

export type LogoMarkSize = 24 | 28 | 40;

export interface LogoMarkProps {
  /** Rendered width and height in px (the asset is square). */
  size?: LogoMarkSize;
  /** "" when visible text next to the mark already names QueryLens. */
  alt?: string;
  class?: string;
}

/**
 * QueryLens mark from public/images/querylens.webp, with public/images/querylens.png as fallback.
 */
export function LogoMark({ size = 28, alt = APP_NAME, class: className }: LogoMarkProps) {
  return (
    <picture class={cx("inline-flex shrink-0", className)}>
      <source srcset={LOGO_WEBP} type="image/webp" />
      <img src={LOGO_PNG} alt={alt} width={size} height={size} class="block object-contain" decoding="async" />
    </picture>
  );
}

export interface LogoProps {
  size?: "sm" | "lg";
  href?: string;
  class?: string;
}

/** Mark + "QueryLens" wordmark */
export function Logo({ size = "sm", href, class: className }: LogoProps) {
  const content = (
    <>
      <LogoMark size={size === "lg" ? 40 : 24} alt="" />
      <span class={cx("text-text-primary font-semibold", size === "lg" ? "text-lg" : "text-md")}>{APP_NAME}</span>
    </>
  );
  const classes = cx("inline-flex items-center", size === "lg" ? "gap-3" : "gap-2", className);

  return href ? (
    <a href={href} class={cx(classes, "rounded-lg")} aria-label={`${APP_NAME} home`}>
      {content}
    </a>
  ) : (
    <span class={classes}>{content}</span>
  );
}
