import { cx } from "@/shared/lib/cx.js";
import type { Child } from "hono/jsx";

export interface CardProps {
  /** 16px / 600 title on the left of the header. */
  title?: Child;
  /** Optional action (ghost button or status badge) on the right of the header. */
  action?: Child;
  /** 2px left accent bar for degraded / critical cards (§4.5). */
  accent?: "warning" | "danger";
  /** false for cards that wrap a table: no internal padding, header gets its own padding + divider. */
  padded?: boolean;
  /** Renders the card as a different element (e.g. "article", "section"). */
  as?: "div" | "section" | "article";
  class?: string;
  children?: Child;
  [attr: string]: unknown;
}

const accents = {
  warning: "border-l-2 border-l-warning",
  danger: "border-l-2 border-l-danger",
};

export function Card(props: CardProps) {
  const { title, action, accent, padded = true, as = "div", class: className, children, ...rest } = props;
  const Tag = as;
  const hasHeader = title !== undefined || action !== undefined;

  return (
    <Tag
      class={cx("border-line bg-surface rounded-xl border", padded && "p-6", accent && accents[accent], className)}
      {...rest}
    >
      {hasHeader && (
        <div class={cx("flex items-center justify-between gap-4", padded ? "mb-4" : "border-line border-b px-6 py-4")}>
          {typeof title === "string" ? <h2 class="text-md text-fg font-semibold">{title}</h2> : title}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}
