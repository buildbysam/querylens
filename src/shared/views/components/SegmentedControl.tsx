import { cx } from "@/shared/lib/cx.js";

export interface Segment {
  value: string;
  label: string;
  /** Server-driven selection: the segment is a link. */
  href?: string;
}

export interface SegmentedControlProps {
  /** Accessible group name, e.g. "System view". */
  label: string;
  segments: Segment[];
  /** Server-rendered active value. */
  active?: string;
  /**
   * Alpine-driven selection: name of a property in the enclosing x-data scope.
   * Clicking sets it; the active style follows it.
   */
  model?: string;
  class?: string;
}

const track = "inline-flex h-8 items-center rounded-lg bg-subtle p-0.5";
const segmentBase =
  "inline-flex h-7 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-standard";
const inactive = "text-fg-secondary hover:text-fg";
const activeCls = "bg-elevated text-accent";

export function SegmentedControl({ label, segments, active, model, class: className }: SegmentedControlProps) {
  return (
    <div role="group" aria-label={label} class={cx(track, "max-w-full overflow-x-auto", className)}>
      {segments.map((segment) => {
        const isActive = segment.value === active;
        if (segment.href && !model) {
          return (
            <a
              href={segment.href}
              class={cx(segmentBase, isActive ? activeCls : inactive)}
              aria-current={isActive ? "true" : undefined}
            >
              {segment.label}
            </a>
          );
        }
        const value = JSON.stringify(segment.value).replace(/"/g, "'");
        return (
          <button
            type="button"
            class={cx(segmentBase, isActive ? activeCls : inactive)}
            aria-pressed={isActive ? "true" : "false"}
            {...(model
              ? {
                  "x-on:click": `${model} = ${value}`,
                  "x-bind:class": `${model} === ${value} ? '${activeCls}' : '${inactive}'`,
                  "x-bind:aria-pressed": `(${model} === ${value}).toString()`,
                }
              : {})}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
