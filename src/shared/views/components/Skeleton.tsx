import { cx } from "@/shared/lib/cx.js";

/** rounded placeholder block pulsing between 0.6 and 1 opacity. No spinners. */
export function Skeleton({ class: className }: { class?: string }) {
  return <span class={cx("animate-skeleton bg-elevated block rounded-md", className)} aria-hidden="true" />;
}

/** Table-shaped skeleton */
export function SkeletonRows({
  rows = 5,
  columns = 4,
  label = "Loading",
}: {
  rows?: number;
  columns?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-label={label}>
      {Array.from({ length: rows }, () => (
        <div class="border-border-subtle flex h-10 items-center gap-6 border-b px-4 last:border-b-0">
          {Array.from({ length: columns }, (_, col) => (
            <Skeleton class={cx("h-3", col === 0 ? "w-1/4" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Card-shaped skeleton for grids (database cards). */
export function SkeletonCard() {
  return (
    <div class="border-border-subtle bg-surface flex flex-col gap-4 rounded-xl border p-6" aria-hidden="true">
      <Skeleton class="h-4 w-1/2" />
      <Skeleton class="h-3 w-3/4" />
      <Skeleton class="h-8 w-full" />
    </div>
  );
}
