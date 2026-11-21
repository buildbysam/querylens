import { cx } from "@/shared/lib/cx.js";
import type { Child } from "hono/jsx";

export type Density = "default" | "compact";

export const thClass =
  "sticky top-0 z-10 h-10 border-b border-border bg-table-header px-4 align-middle text-xs font-semibold uppercase tracking-label whitespace-nowrap text-text-secondary";
export const trClass =
  "border-b border-border-subtle transition-colors duration-150 ease-standard last:border-b-0 hover:bg-hover";

export function tdClass(opts: { mono?: boolean; numeric?: boolean; density?: Density } = {}) {
  return cx(
    "px-4 align-middle whitespace-nowrap",
    opts.density === "compact" ? "h-9" : "h-10",
    opts.mono || opts.numeric ? "font-mono text-sm" : "text-sm",
    opts.numeric ? "text-right tabular-nums" : "text-left",
    "text-text-primary"
  );
}

export interface TableProps {
  head: Child;
  children?: Child;
  /** Accessible caption (visually hidden). */
  caption?: string;
  /** Max height for the scroll container so the sticky header has something to stick to. */
  scrollClass?: string;
  class?: string;
  /** Attributes for the <tbody> (e.g. x-ref, aria-live). */
  bodyAttrs?: Record<string, unknown>;
}

/** Scroll wrapper + <table>. The surrounding Card provides surface, border, radius. */
export function Table({ head, children, caption, scrollClass, class: className, bodyAttrs }: TableProps) {
  return (
    <div class={cx("overflow-x-auto", scrollClass)}>
      <table class={cx("w-full border-collapse", className)}>
        {caption && <caption class="sr-only">{caption}</caption>}
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody {...bodyAttrs}>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  numeric,
  class: className,
  ...rest
}: {
  children?: Child;
  numeric?: boolean;
  class?: string;
  [attr: string]: unknown;
}) {
  return (
    <th scope="col" class={cx(thClass, numeric ? "text-right" : "text-left", className)} {...rest}>
      {children}
    </th>
  );
}

export function Tr({
  children,
  class: className,
  ...rest
}: {
  children?: Child;
  class?: string;
  [attr: string]: unknown;
}) {
  return (
    <tr class={cx(trClass, className)} {...rest}>
      {children}
    </tr>
  );
}

export function Td(props: {
  children?: Child;
  mono?: boolean;
  numeric?: boolean;
  density?: Density;
  class?: string;
  [attr: string]: unknown;
}) {
  const { children, mono, numeric, density, class: className, ...rest } = props;
  return (
    <td class={cx(tdClass({ mono, numeric, density }), className)} {...rest}>
      {children}
    </td>
  );
}

/** Empty / skeleton / error content spanning the whole table body. */
export function TableEmptyRow({ colSpan, children }: { colSpan: number; children: Child }) {
  return (
    <tr>
      <td colspan={colSpan} class="p-0">
        {children}
      </td>
    </tr>
  );
}

export interface Column<Row> {
  key: string;
  label: string;
  mono?: boolean;
  numeric?: boolean;
  class?: string;
  render?: (row: Row) => Child;
}

export interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  empty: Child;
  density?: Density;
  caption?: string;
  scrollClass?: string;
}

export function DataTable<Row extends Record<string, unknown>>(props: DataTableProps<Row>) {
  const { columns, rows, empty, density, caption, scrollClass } = props;
  return (
    <Table
      caption={caption}
      scrollClass={scrollClass}
      head={columns.map((col) => (
        <Th numeric={col.numeric}>{col.label}</Th>
      ))}
    >
      {rows.length === 0 ? (
        <TableEmptyRow colSpan={columns.length}>{empty}</TableEmptyRow>
      ) : (
        rows.map((row) => (
          <Tr>
            {columns.map((col) => (
              <Td mono={col.mono} numeric={col.numeric} density={density} class={col.class}>
                {col.render ? col.render(row) : String(row[col.key] ?? "")}
              </Td>
            ))}
          </Tr>
        ))
      )}
    </Table>
  );
}
