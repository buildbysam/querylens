import { cx } from "@/shared/lib/cx.js";

export type StatusVariant = "success" | "warning" | "danger" | "info" | "muted";

const variants: Record<StatusVariant, string> = {
  success: "bg-success-bg/20 text-success",
  warning: "bg-warning-bg/20 text-warning",
  danger: "bg-danger-bg/20 text-danger",
  info: "bg-info-bg/20 text-info",
  muted: "bg-elevated text-inactive",
};

export interface StatusBadgeProps {
  variant: StatusVariant;
  /** Always rendered — status is never conveyed by colour alone (§4.4). */
  label: string;
  /** Adds role="status" + aria-live="polite" for regions that update in place (§7). */
  live?: boolean;
  /** Hide the dot (e.g. service tags in the /health events table). */
  dot?: boolean;
  class?: string;
}

export function StatusBadge({ variant, label, live, dot = true, class: className }: StatusBadgeProps) {
  return (
    <span
      class={cx(
        "text-2xs tracking-label inline-flex h-5.5 shrink-0 items-center gap-1 rounded-md px-2 font-semibold whitespace-nowrap uppercase",
        variants[variant],
        className
      )}
      {...(live ? { role: "status", "aria-live": "polite" } : {})}
    >
      {dot && <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {label}
    </span>
  );
}
