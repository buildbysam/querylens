import { cx } from "@/shared/lib/cx.js";
import { Icon, type IconName } from "@/shared/views/components/Icon.js";
import type { Child } from "hono/jsx";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 ease-standard disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-9 px-3 text-base",
  lg: "h-10 px-4 text-base",
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-canvas enabled:hover:bg-accent-hover",
  secondary: "border border-line text-fg-secondary enabled:hover:border-line-strong enabled:hover:bg-elevated",
  danger: "border border-danger text-danger enabled:hover:bg-danger/12",
  ghost: "text-fg-secondary enabled:hover:bg-elevated enabled:hover:text-fg",
};

/** Anchors have no :enabled state, so they get plain hover styles. */
const linkVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-canvas hover:bg-accent-hover",
  secondary: "border border-line text-fg-secondary hover:border-line-strong hover:bg-elevated",
  danger: "border border-danger text-danger hover:bg-danger/12",
  ghost: "text-fg-secondary hover:bg-elevated hover:text-fg",
};

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", isLink = false) {
  return cx(base, sizes[size], isLink ? linkVariants[variant] : variants[variant]);
}

export function Spinner({ class: className }: { class?: string }) {
  return (
    <span
      class={cx(
        "inline-block size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent",
        className
      )}
      aria-hidden="true"
    />
  );
}

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading Lucide icon. */
  icon?: IconName;
  /** Trailing Lucide icon (e.g. "View →"). */
  trailingIcon?: IconName;
  /** Renders an <a> instead of a <button>. */
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** Server-side loading state: ring replaces the leading icon. */
  loading?: boolean;
  /**
   * Alpine expression for client-side loading. While truthy the ring replaces the
   * leading icon and the button is disabled; the label stays (§4.1).
   */
  loadingWhen?: string;
  class?: string;
  children?: Child;
  /** Any extra attribute (aria-*, x-on:*, name, value, form, …). */
  [attr: string]: unknown;
}

export function Button(props: ButtonProps) {
  const {
    variant = "secondary",
    size = "md",
    icon,
    trailingIcon,
    href,
    type = "button",
    disabled,
    loading,
    loadingWhen,
    class: className,
    children,
    ...rest
  } = props;

  const leading = loadingWhen ? (
    <>
      <span x-show={loadingWhen} x-cloak class="inline-flex">
        <Spinner />
      </span>
      {icon && (
        <span x-show={`!(${loadingWhen})`} class="inline-flex">
          <Icon name={icon} />
        </span>
      )}
    </>
  ) : loading ? (
    <Spinner />
  ) : icon ? (
    <Icon name={icon} />
  ) : null;

  const inner = (
    <>
      {leading}
      {children}
      {trailingIcon && <Icon name={trailingIcon} />}
    </>
  );

  if (href) {
    return (
      <a href={href} class={cx(buttonClass(variant, size, true), className)} {...rest}>
        {inner}
      </a>
    );
  }

  return (
    <button
      type={type}
      class={cx(buttonClass(variant, size), className)}
      disabled={disabled || loading}
      aria-busy={loading ? "true" : undefined}
      {...(loadingWhen
        ? {
            "x-bind:disabled": `${disabled ? "true" : "false"} || (${loadingWhen})`,
            "x-bind:aria-busy": `!!(${loadingWhen})`,
          }
        : {})}
      {...rest}
    >
      {inner}
    </button>
  );
}
