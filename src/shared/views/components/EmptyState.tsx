import { cx } from "@/shared/lib/cx.js";
import { Icon, type IconName } from "@/shared/views/components/Icon.js";
import type { Child } from "hono/jsx";

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: Child;
  /** Exactly one primary CTA, or a ghost link if optional (§4.10). Omit for none. */
  action?: Child;
  class?: string;
}

export function EmptyState({ icon, title, description, action, class: className }: EmptyStateProps) {
  return (
    <div class={cx("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <Icon name={icon} size={32} class="text-text-muted" />
      <h3 class="text-md text-text-primary mt-2 font-semibold">{title}</h3>
      {description && <p class="max-w-copy text-text-secondary text-sm">{description}</p>}
      {action && <div class="mt-4">{action}</div>}
    </div>
  );
}
