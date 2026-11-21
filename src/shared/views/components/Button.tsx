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
  primary: "bg-brand-600 text-text-inverse enabled:hover:bg-brand-700",
  secondary:
    "border border-border bg-surface text-text-primary enabled:hover:border-border-hover enabled:hover:bg-hover",
  danger: "border border-danger/60 text-danger enabled:hover:border-danger enabled:hover:bg-danger-bg/40",
  ghost: "text-text-secondary enabled:hover:bg-hover enabled:hover:text-text-primary",
};

const linkVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-text-inverse hover:bg-brand-700",
  secondary: "border border-border bg-surface text-text-primary hover:border-border-hover hover:bg-hover",
  danger: "border border-danger/60 text-danger hover:border-danger hover:bg-danger-bg/40",
  ghost: "text-text-secondary hover:bg-hover hover:text-text-primary",
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
  /** leading icon (name of a file in public/images/icons). */
  icon?: IconName;
  /** trailing icon (e.g. "arrow-right"). */
  trailingIcon?: IconName;
  /** Renders an <a> instead of a <button>. */
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  /** Server-side loading state: ring replaces the leading icon. */
  loading?: boolean;
  /**
   * alpine expression for client-side loading */
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
          <Icon name={icon} size={16} />
        </span>
      )}
    </>
  ) : loading ? (
    <Spinner />
  ) : icon ? (
    <Icon name={icon} size={16} />
  ) : null;

  const inner = (
    <>
      {leading}
      {children}
      {trailingIcon && <Icon name={trailingIcon} size={16} />}
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
