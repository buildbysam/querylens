import { cx } from "@/shared/lib/cx.js";
import { Icon, type IconName } from "@/shared/views/components/Icon.js";
import type { Child } from "hono/jsx";

export type BannerStatus = "success" | "warning" | "danger";

const styles: Record<BannerStatus, { box: string; icon: string; iconName: IconName }> = {
  success: { box: "bg-success/10 border-success/35", icon: "text-success", iconName: "check-circle" },
  warning: { box: "bg-warning/10 border-warning/35", icon: "text-warning", iconName: "alert-triangle" },
  danger: { box: "bg-danger/10 border-danger/35", icon: "text-danger", iconName: "x-circle" },
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
  const s = styles[status];
  return (
    <div
      class={cx("flex min-h-24 items-center gap-4 rounded-xl border px-6 py-4", s.box, className)}
      role="status"
      aria-live="polite"
    >
      <Icon name={s.iconName} size={32} class={s.icon} />
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <p class="tracking-heading text-fg text-lg font-semibold">{headline}</p>
        {subline && <p class="text-fg-secondary text-sm">{subline}</p>}
      </div>
      {action && <div class="shrink-0">{action}</div>}
    </div>
  );
}
