import { cx } from "@/shared/lib/cx.js";
import type { StatusVariant } from "@/shared/views/components/StatusBadge.js";

const dotColor: Record<StatusVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-inactive",
};

export interface StatusDotProps {
  variant: StatusVariant;
  /** Text next to the dot. Omit only when an adjacent label already names the status. */
  label?: string;
  /** Pulsing dot — reserved for /health (§2.5). */
  pulse?: boolean;
  class?: string;
}

export function StatusDot({ variant, label, pulse, class: className }: StatusDotProps) {
  return (
    <span class={cx("inline-flex items-center gap-2 text-sm", className)}>
      <span
        class={cx("size-1.5 shrink-0 rounded-full", dotColor[variant], pulse && "animate-live")}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
