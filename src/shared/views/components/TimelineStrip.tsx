import { cx } from "@/shared/lib/cx.js";

export type TimelineStatus = "success" | "warning" | "danger" | "none";

export interface TimelineSample {
  status: TimelineStatus;
  /** HH:MM:SS of the check. */
  time?: string;
  latencyMs?: number;
}

const BAR_COUNT = 40;

const barColor: Record<TimelineStatus, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  none: "bg-elevated",
};

const statusText: Record<TimelineStatus, string> = {
  success: "healthy",
  warning: "degraded",
  danger: "critical",
  none: "no data",
};

export function TimelineStrip({
  samples,
  label,
  class: className,
}: {
  samples: TimelineSample[];
  label: string;
  class?: string;
}) {
  const recent = samples.slice(-BAR_COUNT);
  const bars: TimelineSample[] = [
    ...Array.from({ length: BAR_COUNT - recent.length }, () => ({ status: "none" as const })),
    ...recent,
  ];

  const counts = recent.reduce<Record<TimelineStatus, number>>(
    (acc, s) => ({ ...acc, [s.status]: acc[s.status] + 1 }),
    { success: 0, warning: 0, danger: 0, none: 0 }
  );
  const summary = `${label}: last ${recent.length} checks — ${counts.success} healthy, ${counts.warning} degraded, ${counts.danger} critical`;

  return (
    <div role="img" aria-label={summary} class={cx("flex h-5 items-end gap-1", className)}>
      {bars.map((bar) => (
        <span class="group relative block h-5 w-1">
          <span class={cx("block h-full w-full rounded-sm", barColor[bar.status])} />
          {bar.time && (
            <span
              class="border-border bg-elevated text-text-secondary shadow-overlay pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden -translate-x-1/2 rounded-lg border px-2 py-1 text-xs whitespace-nowrap group-hover:block"
              aria-hidden="true"
            >
              <span class="font-mono">{bar.time}</span> · {statusText[bar.status]}
              {bar.latencyMs !== undefined && (
                <>
                  {" · "}
                  <span class="font-mono">{bar.latencyMs}ms</span>
                </>
              )}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}
