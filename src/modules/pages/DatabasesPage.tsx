import type { DatabaseSummary } from "@/modules/databases/types.js";
import { formatDuration, formatRelative } from "@/shared/lib/time.js";
import { alpineData, PAGE_SCRIPTS } from "@/shared/views/assets.js";
import { Button } from "@/shared/views/components/Button.js";
import { EmptyState } from "@/shared/views/components/EmptyState.js";
import { Input } from "@/shared/views/components/Input.js";
import { MetricRow } from "@/shared/views/components/MetricRow.js";
import { Modal, modalTrigger } from "@/shared/views/components/Modal.js";
import { PasswordInput } from "@/shared/views/components/PasswordInput.js";
import type { SystemStatus } from "@/shared/views/components/Sidebar.js";
import { StatusDot } from "@/shared/views/components/StatusDot.js";
import type { CurrentUser } from "@/shared/views/components/TopBar.js";
import { AppLayout } from "@/shared/views/layouts/AppLayout.js";
import { Icon } from "@/shared/views/components/Icon.js";

const MODAL_ID = "register-database";
const FORM_ID = "register-database-form";

export interface DatabasesPageProps {
  user: CurrentUser;
  systemStatus: SystemStatus;
  databases: DatabaseSummary[];
  now: Date;
  /** Open the register modal on load (top-bar "New Database" → ?register=1). */
  openRegister?: boolean;
}

const stateDisplay = {
  connected: { variant: "success", label: "Connected" },
  unreachable: { variant: "danger", label: "Unreachable" },
  pending: { variant: "muted", label: "Pending" },
} as const;

function DatabaseCard({ db, now }: { db: DatabaseSummary; now: Date }) {
  const state = stateDisplay[db.state];
  const href = `/app/snapshots?database=${encodeURIComponent(db.id)}`;
  const endpoint = `postgres://${db.host}:${db.port}`;

  return (
    <article class="border-border-subtle bg-surface ease-standard hover:border-brand-700 relative flex cursor-pointer flex-col gap-4 rounded-xl border p-6 transition-colors duration-150">
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-md text-text-primary min-w-0 truncate font-semibold">
          {/* stretched link: the whole card navigates to the snapshots view */}
          <a href={href} class="rounded-md after:absolute after:inset-0">
            {db.name}
          </a>
        </h2>
        <StatusDot variant={state.variant} label={state.label} class="text-text-secondary shrink-0" />
      </div>

      <p class="text-text-muted -mt-2 truncate font-mono text-sm" title={`${endpoint}/${db.databaseName}`}>
        {endpoint}
      </p>

      <MetricRow
        metrics={[
          { label: "Uptime", value: db.uptimeSeconds !== null ? formatDuration(db.uptimeSeconds) : "—" },
          { label: "Last collected", value: db.lastCollectedAt ? formatRelative(db.lastCollectedAt, now) : "—" },
          { label: "Views available", value: db.viewsAvailable ?? "—" },
        ]}
      />

      <div class="mt-auto flex items-center justify-between gap-4">
        <p class="text-text-muted text-xs">
          {db.lastCollectedAt ? `Last collected ${formatRelative(db.lastCollectedAt, now)}` : "Not collected yet"}
        </p>
        <a
          href={href}
          tabindex={-1}
          class="text-brand-400 ease-standard hover:text-brand-100 relative z-10 inline-flex items-center gap-2 rounded-md text-sm font-medium transition-colors duration-150"
        >
          View
          <Icon name="arrow-right" size={16} />
        </a>
      </div>
    </article>
  );
}

function AddTile() {
  return (
    <button
      type="button"
      {...modalTrigger(MODAL_ID)}
      class="border-border text-text-muted ease-standard hover:border-brand-600 hover:text-brand-400 flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed transition-colors duration-150"
    >
      <Icon name="plus" size={20} />
      <span class="text-base font-medium">Register Database</span>
    </button>
  );
}

function RegisterModal({ openOnLoad }: { openOnLoad: boolean }) {
  return (
    <Modal
      id={MODAL_ID}
      title="Register Database"
      bodyData={alpineData("registerDatabase", { modalId: MODAL_ID, openOnLoad })}
      footer={
        <>
          <Button variant="secondary" loadingWhen="test.state === 'testing'" x-on:click="runTest()">
            Test Connection
          </Button>
          <div class="flex items-center gap-4">
            <Button variant="ghost" x-on:click="close()">
              Cancel
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              variant="primary"
              loadingWhen="submitting"
              disabled
              x-bind:disabled="test.state !== 'ok' || submitting"
              x-bind:title="test.state !== 'ok' ? 'Test the connection first' : null"
            >
              Register
            </Button>
          </div>
        </>
      }
    >
      <form id={FORM_ID} class="flex flex-col gap-4" novalidate x-bind="formEvents" x-on:input="onEdit()">
        <Input
          name="name"
          label="Name"
          placeholder="orders-production"
          required
          alpineError="errors.name"
          inputAttrs={{ "x-model": "form.name", "data-autofocus": true, autocomplete: "off" }}
        />
        <div class="flex gap-4">
          <Input
            name="host"
            label="Host"
            placeholder="db.internal"
            required
            class="flex-1"
            alpineError="errors.host"
            inputAttrs={{ "x-model": "form.host", autocomplete: "off", spellcheck: "false" }}
          />
          <Input
            name="port"
            label="Port"
            type="number"
            required
            class="w-28"
            alpineError="errors.port"
            inputAttrs={{ "x-model": "form.port", min: 1, max: 65535, inputmode: "numeric" }}
          />
        </div>
        <Input
          name="databaseName"
          label="Database"
          placeholder="postgres"
          required
          alpineError="errors.databaseName"
          inputAttrs={{ "x-model": "form.databaseName", autocomplete: "off", spellcheck: "false" }}
        />
        <Input
          name="username"
          label="Username"
          placeholder="querylens_monitor"
          required
          alpineError="errors.username"
          inputAttrs={{ "x-model": "form.username", autocomplete: "off", spellcheck: "false" }}
        />
        <PasswordInput
          name="password"
          label="Password"
          autocomplete="new-password"
          alpineError="errors.password"
          inputAttrs={{ "x-model": "form.password" }}
        />

        <p class="min-h-5 text-sm" role="status" aria-live="polite">
          <span x-show="test.state === 'testing'" x-cloak class="text-text-muted">
            Testing connection…
          </span>
          <span x-show="test.state === 'ok'" x-cloak class="text-success">
            ✓ Connected
          </span>
          <span x-show="test.state === 'fail'" x-cloak class="text-danger" x-text="'✗ Failed — ' + test.reason" />
          <span x-show="message" x-cloak class="text-danger" x-text="message" />
        </p>
      </form>
    </Modal>
  );
}

export function DatabasesPage({ user, systemStatus, databases, now, openRegister }: DatabasesPageProps) {
  const count = databases.length;
  return (
    <AppLayout
      title="Databases"
      active="databases"
      user={user}
      systemStatus={systemStatus}
      script={PAGE_SCRIPTS.databases}
    >
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="tracking-heading text-text-primary text-xl font-semibold">Databases</h1>
          <p id="databases-count" class="text-text-muted mt-1 text-sm">
            {count} registered {count === 1 ? "instance" : "instances"}
          </p>
        </div>
        <Button variant="primary" size="md" icon="plus" {...modalTrigger(MODAL_ID)}>
          Register Database
        </Button>
      </div>

      <section id="databases-region" aria-label="Registered databases">
        {count === 0 ? (
          <div class="border-border-subtle bg-surface rounded-xl border">
            <EmptyState
              icon="database"
              title="No databases registered yet"
              description="Register a PostgreSQL database to begin collecting statistics."
              action={
                <Button variant="primary" icon="plus" {...modalTrigger(MODAL_ID)}>
                  Register Database
                </Button>
              }
            />
          </div>
        ) : (
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {databases.map((db) => (
              <DatabaseCard db={db} now={now} />
            ))}
            <AddTile />
          </div>
        )}
      </section>

      <RegisterModal openOnLoad={openRegister ?? false} />
    </AppLayout>
  );
}
