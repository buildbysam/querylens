import { cx } from "@/shared/lib/cx.js";
import type { Child } from "hono/jsx";

export interface Metric {
  label: string;
  value: Child;
  /** Turns the value danger (e.g. "Errors (1h)" > 0). */
  tone?: "danger" | "warning";
}

/**
 * inline stats
 */
export function MetricRow({ metrics, class: className }: { metrics: Metric[]; class?: string }) {
  return (
    <dl class={cx("flex flex-wrap items-end gap-x-3 gap-y-2", className)}>
      {metrics.map((metric, index) => (
        <>
          {index > 0 && (
            <div class="text-text-muted" aria-hidden="true">
              ·
            </div>
          )}
          <div class="flex min-w-0 flex-col gap-1">
            <dt class="text-2xs tracking-label text-text-muted font-semibold uppercase">{metric.label}</dt>
            <dd
              class={cx(
                "truncate font-mono text-base tabular-nums",
                metric.tone === "danger"
                  ? "text-danger"
                  : metric.tone === "warning"
                    ? "text-warning"
                    : "text-text-primary"
              )}
            >
              {metric.value}
            </dd>
          </div>
        </>
      ))}
    </dl>
  );
}
