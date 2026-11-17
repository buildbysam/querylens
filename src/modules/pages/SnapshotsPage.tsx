import type { DatabaseSummary } from "@/modules/databases/types.js";
import type { SnapshotRecord, ViewInfo } from "@/modules/snapshots/service.js";
import { cx } from "@/shared/lib/cx.js";
import { scriptJson } from "@/shared/lib/script-json.js";
import { alpineData, PAGE_SCRIPTS } from "@/shared/views/assets.js";
import { Button } from "@/shared/views/components/Button.js";
import { DatabasePill, type PillDatabase } from "@/shared/views/components/DatabasePill.js";
import { tdClass, thClass, trClass } from "@/shared/views/components/DataTable.js";
import { EmptyState } from "@/shared/views/components/EmptyState.js";
import { SegmentedControl } from "@/shared/views/components/SegmentedControl.js";
import type { SystemStatus } from "@/shared/views/components/Sidebar.js";
import { SkeletonRows } from "@/shared/views/components/Skeleton.js";
import type { CurrentUser } from "@/shared/views/components/TopBar.js";
import { AppLayout } from "@/shared/views/layouts/AppLayout.js";
import type { Child } from "hono/jsx";

const POLL_MS = 30_000;
const CONFIG_ID = "snapshots-config";

export interface SnapshotsPageProps {
  user: CurrentUser;
  systemStatus: SystemStatus;
  databases: DatabaseSummary[];
  /** Absent when no database is registered. */
  selected?: DatabaseSummary;
  views: ViewInfo[];
  activeView: string;
  snapshot: SnapshotRecord | null;
  /** Whether this database has any snapshot of any view. */
  hasAnySnapshots: boolean;
  intervalSeconds: number;
}

const pillStatus = {
  connected: { status: "success", statusLabel: "Connected" },
  unreachable: { status: "danger", statusLabel: "Unreachable" },
  pending: { status: "muted", statusLabel: "Pending" },
} as const;

/** Classes used by the client-rendered table — full literals so Tailwind generates them. */
const cellClasses = {
  text: cx(tdClass(), "max-w-md truncate"),
  mono: cx(tdClass({ mono: true }), "max-w-md truncate"),
  numeric: tdClass({ numeric: true }),
  nullValue: "text-fg-muted",
};

function NoDatabases({ user, systemStatus }: Pick<SnapshotsPageProps, "user" | "systemStatus">) {
  return (
    <AppLayout
      title="Snapshots"
      active="snapshots"
      user={user}
      systemStatus={systemStatus}
      script={PAGE_SCRIPTS.snapshots}
    >
      <PageHeader />
      <div class="border-line bg-surface rounded-xl border">
        <EmptyState
          icon="database"
          title="No databases registered yet"
          description="Register a PostgreSQL database to begin collecting statistics."
          action={
            <Button variant="primary" icon="plus" href="/app/databases?register=1">
              Register Database
            </Button>
          }
        />
      </div>
    </AppLayout>
  );
}

function PageHeader({ children }: { children?: Child }) {
  return (
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="tracking-heading text-fg text-xl font-semibold">Snapshots</h1>
        <p class="text-fg-muted mt-1 text-sm">Collected statistics — read-only</p>
      </div>
      {children}
    </div>
  );
}

/** /app/snapshots. */
export function SnapshotsPage(props: SnapshotsPageProps) {
  const { user, systemStatus, databases, selected, views, activeView, snapshot, hasAnySnapshots, intervalSeconds } =
    props;
  if (!selected) return <NoDatabases user={user} systemStatus={systemStatus} />;

  const pillDatabases: PillDatabase[] = databases.map((d) => ({
    id: d.id,
    name: d.name,
    host: d.host,
    port: d.port,
    ...pillStatus[d.state],
  }));
  const config = {
    database: selected.id,
    view: activeView,
    snapshot,
    hasAny: hasAnySnapshots,
    pollMs: POLL_MS,
    classes: cellClasses,
  };

  return (
    <AppLayout
      title="Snapshots"
      script={PAGE_SCRIPTS.snapshots}
      active="snapshots"
      user={user}
      systemStatus={systemStatus}
      pill={
        <DatabasePill
          databases={pillDatabases}
          selectedId={selected.id}
          hrefFor={(id) => `/app/snapshots?database=${encodeURIComponent(id)}&view=${encodeURIComponent(activeView)}`}
        />
      }
    >
      <script type="application/json" id={CONFIG_ID} dangerouslySetInnerHTML={{ __html: scriptJson(config) }} />

      <div class="flex flex-col gap-6" x-data={alpineData("snapshotViewer", CONFIG_ID)}>
        <PageHeader>
          <div class="flex max-w-full flex-wrap items-center gap-2">
            <SegmentedControl
              label="System view"
              model="view"
              active={activeView}
              segments={views.map((v) => ({ value: v.name, label: v.name }))}
            />
            <Button
              variant="ghost"
              icon="refresh-cw"
              loadingWhen="fetching"
              x-on:click="refresh()"
              aria-label="Refresh snapshot"
            >
              Refresh
            </Button>
          </div>
        </PageHeader>

        {/* fetch error: danger left bar + Retry; data, if any, stays visible below */}
        <div
          x-show="failed"
          x-cloak
          role="alert"
          class="border-line border-l-danger bg-surface flex items-center justify-between gap-4 rounded-xl border border-l-2 px-6 py-4"
        >
          <p class="text-fg text-sm">Couldn't load snapshots.</p>
          <Button variant="ghost" size="sm" icon="refresh-cw" x-on:click="refresh()">
            Retry
          </Button>
        </div>

        <section class="border-line bg-surface overflow-hidden rounded-xl border" aria-labelledby="snapshot-title">
          <div class="border-line flex items-center justify-between gap-4 border-b px-6 py-4">
            <h2 id="snapshot-title" class="text-md text-fg truncate font-mono font-semibold" x-text="view">
              {activeView}
            </h2>
            <p class="text-fg-muted shrink-0 text-xs" x-show="snapshot">
              Updated <span x-text="updatedLabel" />
            </p>
          </div>

          <template x-if="status === 'ready'">
            <div>
              <p class="border-line text-fg-muted border-b px-6 py-3 text-xs">
                Showing the latest snapshot · <span class="font-mono" x-text="snapshot.rowCount" /> rows
              </p>
              <template x-if="rows.length > 0">
                <div class="max-h-160 overflow-auto">
                  <table class="w-full border-collapse">
                    <caption class="sr-only" x-text="view + ' — latest snapshot'" />
                    <thead>
                      <tr>
                        <template x-for="col in columns" x-bind:key="col.key">
                          <th
                            scope="col"
                            class={thClass}
                            x-bind:class="col.kind === 'numeric' ? 'text-right' : 'text-left'"
                            x-text="col.label"
                          />
                        </template>
                      </tr>
                    </thead>
                    <tbody>
                      <template x-for="(row, i) in rows" x-bind:key="i">
                        <tr class={trClass}>
                          <template x-for="col in columns" x-bind:key="col.key">
                            <td
                              x-bind:class="cellClass(col, row[col.key])"
                              x-text="display(row[col.key])"
                              x-bind:title="col.kind !== 'numeric' ? display(row[col.key]) : null"
                            />
                          </template>
                        </tr>
                      </template>
                    </tbody>
                  </table>
                </div>
              </template>
              <template x-if="rows.length === 0">
                <EmptyState
                  icon="inbox"
                  title="This view returned no rows"
                  description="The latest snapshot of this view is empty on this database."
                />
              </template>
            </div>
          </template>

          <div x-show="status === 'loading'" x-cloak>
            <SkeletonRows rows={5} columns={5} label="Loading snapshot" />
          </div>

          <div x-show="status === 'empty'" x-cloak>
            <EmptyState
              icon="clock"
              title="No snapshots collected yet"
              description={`Collection runs every ${intervalSeconds} seconds. Check back shortly.`}
            />
          </div>

          <div x-show="status === 'unavailable'" x-cloak>
            <EmptyState
              icon="info"
              title="View not available on this database"
              description="This PostgreSQL instance does not expose the selected view."
            />
          </div>

          <div x-show="status === 'error'" x-cloak>
            <EmptyState
              icon="alert-triangle"
              title="No data to show"
              description="The snapshot couldn't be loaded. Use Retry above."
            />
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
