import { Dropdown } from "@/shared/views/components/Select.js";
import type { StatusVariant } from "@/shared/views/components/StatusBadge.js";
import { StatusDot } from "@/shared/views/components/StatusDot.js";
import { Icon } from "@/shared/views/components/Icon.js";

export interface PillDatabase {
  id: string;
  name: string;
  host: string;
  port: number;
  status: StatusVariant;
  statusLabel: string;
}

export interface DatabasePillProps {
  databases: PillDatabase[];
  selectedId: string;
  /** Builds the link for choosing a database (keeps the current view). */
  hrefFor: (id: string) => string;
}

/**
 * top-bar database pill
 * opens a searchable list of registered databases; choosing one navigates (server-rendered)
 */
export function DatabasePill({ databases, selectedId, hrefFor }: DatabasePillProps) {
  const selected = databases.find((d) => d.id === selectedId);
  if (!selected) return null;

  return (
    <Dropdown
      label="Registered databases"
      searchable
      emptyText="No matching databases"
      panelClass="w-80"
      selected={selected.id}
      triggerClass="inline-flex h-8 max-w-64 items-center gap-2 rounded-lg border border-border bg-elevated px-3 text-sm text-text-primary transition-colors duration-150 ease-standard hover:border-border-hover"
      trigger={
        <>
          <StatusDot variant={selected.status} />
          <span class="sr-only">{selected.statusLabel}: </span>
          <span class="truncate font-medium">{selected.name}</span>
          <Icon name="chevron-down" size={16} class="text-text-muted" />
        </>
      }
      options={databases.map((d) => ({ value: d.id, label: d.name, meta: `${d.host}:${d.port}`, href: hrefFor(d.id) }))}
    />
  );
}
