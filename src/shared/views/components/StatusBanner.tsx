import { cx } from "@/shared/lib/cx.js";
import type { Child } from "hono/jsx";
import { Icon, type IconName } from "@/shared/views/components/Icon.js";

export type BannerStatus = "success" | "warning" | "danger";

const styles: Record<BannerStatus, { box: string; iconClass: string; icon: IconName }> = {
  success: { box: "bg-success-bg/30 border-success/40", iconClass: "text-success", icon: "check-circle" },
  warning: { box: "bg-warning-bg/30 border-warning/40", iconClass: "text-warning", icon: "alert-triangle" },
  danger: { box: "bg-danger-bg/30 border-danger/40", iconClass: "text-danger", icon: "x-circle" },
};

export interface StatusBannerProps {
  status: BannerStatus;
  headline: Child;
  subline?: Child;
  /** Optional single ghost action on the right. */
  action?: Child;
  class?: string;
}

export function StatusBanner({ status, headline, subline, action, class: className }: StatusBannerProps) {
  const { box, iconClass, icon } = styles[status];
  return (
    <div
      class={cx("flex min-h-24 items-center gap-4 rounded-xl border px-6 py-4", box, className)}
      role="status"
      aria-live="polite"
    >
      <Icon name={icon} size={32} class={iconClass} />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="tracking-heading text-text-primary text-lg font-semibold">{headline}</p>
        {subline && <p class="text-text-secondary text-sm">{subline}</p>}
      </div>
      {action && <div class="shrink-0">{action}</div>}
    </div>
  );
}
