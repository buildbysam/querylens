import type { HealthSample } from "@/modules/health/sampler.js";
import type {
  CollectorHealth,
  HealthLevel,
  HealthReport,
  MetadataHealth,
  SchedulerHealth,
} from "@/modules/health/service.js";
import { APP_NAME } from "@/shared/lib/app-info.js";
import { cx } from "@/shared/lib/cx.js";
import type { InternalEvent } from "@/shared/lib/internal-events.js";
import { formatClock, formatHoursMinutes, formatRelative, formatTimestamp, secondsUntil } from "@/shared/lib/time.js";
import { Button } from "@/shared/views/components/Button.js";
import { Card } from "@/shared/views/components/Card.js";
import { CodeBlock } from "@/shared/views/components/CodeBlock.js";
import { Table, TableEmptyRow, Td, Th, Tr } from "@/shared/views/components/DataTable.js";
import { Icon, type IconName } from "@/shared/views/components/Icon.js";
import { MetricRow, type Metric } from "@/shared/views/components/MetricRow.js";
import { Modal, modalTrigger } from "@/shared/views/components/Modal.js";
import type { SystemStatus } from "@/shared/views/components/Sidebar.js";
import { StatusBadge, type StatusVariant } from "@/shared/views/components/StatusBadge.js";
import { StatusBanner } from "@/shared/views/components/StatusBanner.js";
import { StatusDot } from "@/shared/views/components/StatusDot.js";
import { TimelineStrip, type TimelineSample } from "@/shared/views/components/TimelineStrip.js";
import type { CurrentUser } from "@/shared/views/components/TopBar.js";
import { AppLayout } from "@/shared/views/layouts/AppLayout.js";
import type { Child } from "hono/jsx";

const REFRESH_SECONDS = 30;
const DIAGNOSTIC_MODAL = "health-diagnostic";
const LAST_ERROR_MODAL = "collector-last-error";
const RESUME_MODAL = "resume-scheduler";

export interface HealthPageProps {
  user: CurrentUser;
  systemStatus: SystemStatus;
  report: HealthReport;
  history: Record<keyof HealthReport["services"], HealthSample[]>;
  events: InternalEvent[];
  now: Date;
}

const levelVariant: Record<HealthLevel, "success" | "warning" | "danger"> = {
  healthy: "success",
  degraded: "warning",
  critical: "danger",
};
const levelAccent: Record<HealthLevel, "warning" | "danger" | undefined> = {
  healthy: undefined,
  degraded: "warning",
  critical: "danger",
};

const banner: Record<HealthLevel, string> = {
  healthy: "All systems operational",
  degraded: "Partial degradation detected",
  critical: "Platform is down",
};

const serviceTag: Record<InternalEvent["service"], string> = {
  metadata: "Metadata DB",
  collector: "Collector",
  scheduler: "Scheduler",
};
const severityVariant: Record<InternalEvent["severity"], StatusVariant> = {
  info: "info",
  warning: "warning",
  critical: "danger",
};

function toTimeline(samples: HealthSample[]): TimelineSample[] {
  return samples.map((s) => ({ status: levelVariant[s.status], time: formatClock(s.at), latencyMs: s.latencyMs }));
}

/** "* * * * *" for 60s, "*\/5 * * * *" for 5 min; null when the interval isn't expressible as cron. */
function cronFor(intervalSeconds: number): string | null {
  if (intervalSeconds % 60 !== 0) return null;
  const minutes = intervalSeconds / 60;
  return minutes === 1 ? "* * * * *" : `*/${minutes} * * * *`;
}

function Mono({ children }: { children: Child }) {
  return <span class="font-mono">{children}</span>;
}

function InlineMessage({ tone, children, action }: { tone: "warning" | "danger"; children: Child; action?: Child }) {
  return (
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class={cx("text-sm", tone === "danger" ? "text-danger" : "text-warning")}>{children}</p>
      {action}
    </div>
  );
}

interface ServiceCardProps {
  icon: IconName;
  name: string;
  status: HealthLevel;
  label: string;
  metrics: Metric[];
  message?: Child;
  meta: Child;
  samples: HealthSample[];
}

function ServiceCard({ icon, name, status, label, metrics, message, meta, samples }: ServiceCardProps) {
  return (
    <Card as="article" accent={levelAccent[status]} class="flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <Icon name={icon} size={20} class="text-fg-muted" />
        <h2 class="text-md text-fg truncate font-semibold">{name}</h2>
        <StatusBadge variant={levelVariant[status]} label={label} live class="ml-auto" />
      </div>
      <MetricRow metrics={metrics} />
      {message}
      <p class="text-fg-muted text-xs">{meta}</p>
      <TimelineStrip samples={toTimeline(samples)} label={name} class="mt-auto" />
    </Card>
  );
}

function MetadataCard({ s, samples, now }: { s: MetadataHealth; samples: HealthSample[]; now: Date }) {
  return (
    <ServiceCard
      icon="database"
      name="Metadata Database"
      status={s.status}
      label={s.label}
      samples={samples}
      metrics={
        s.connected
          ? [
              { label: "Connection", value: "Connected" },
              { label: "Latency", value: `${s.latencyMs}ms`, tone: s.status === "degraded" ? "warning" : undefined },
              { label: "Pool", value: `${s.pool.used}/${s.pool.max}` },
            ]
          : [{ label: "Connection", value: "Disconnected", tone: "danger" }]
      }
      message={
        !s.connected && (
          <InlineMessage
            tone="danger"
            action={
              <Button variant="ghost" size="sm" icon="refresh-cw" loadingWhen="refreshing" x-on:click="refresh(true)">
                Retry now
              </Button>
            }
          >
            {s.error ?? "Connection failed"} — see logs
          </InlineMessage>
        )
      }
      meta={
        s.connected ? (
          <>
            Last query {formatRelative(s.checkedAt, now)} · SELECT 1 round-trip <Mono>{s.latencyMs}ms</Mono>
          </>
        ) : (
          <>Last checked {formatRelative(s.checkedAt, now)}</>
        )
      }
    />
  );
}

function CollectorCard({ s, samples, now }: { s: CollectorHealth; samples: HealthSample[]; now: Date }) {
  const cron = cronFor(s.intervalSeconds);
  const nextIn = secondsUntil(s.nextRunAt, now);
  const lastTick = s.lastTickAt ? formatRelative(s.lastTickAt, now) : "—";

  return (
    <ServiceCard
      icon="activity"
      name="Collectors"
      status={s.status}
      label={s.label}
      samples={samples}
      metrics={[
        { label: "Collectors", value: `${s.running} Running` },
        { label: "Last tick", value: lastTick },
        { label: "Errors (1h)", value: s.errorsLastHour, tone: s.errorsLastHour > 0 ? "danger" : undefined },
      ]}
      message={
        s.lastCycleFailed ? (
          <InlineMessage
            tone="danger"
            action={
              <Button variant="ghost" size="sm" {...modalTrigger(LAST_ERROR_MODAL)}>
                View last error
              </Button>
            }
          >
            <Mono>Last tick failed: {s.lastError?.message ?? "unknown error"}</Mono>
          </InlineMessage>
        ) : s.stale ? (
          <InlineMessage tone="warning">
            No tick since <Mono>{s.lastCompletedAt ? formatTimestamp(s.lastCompletedAt) : "start-up"}</Mono>
          </InlineMessage>
        ) : s.lastError && s.errorsLastHour > 0 ? (
          <div class="flex justify-end">
            <Button variant="ghost" size="sm" {...modalTrigger(LAST_ERROR_MODAL)}>
              View last error
            </Button>
          </div>
        ) : undefined
      }
      meta={
        <>
          {cron ? (
            <>
              Cron <Mono>{cron}</Mono>
            </>
          ) : (
            <>
              Every <Mono>{s.intervalSeconds}s</Mono>
            </>
          )}
          {" · "}average tick <Mono>{s.averageTickMs !== null ? `${s.averageTickMs}ms` : "—"}</Mono>
          {" · "}next tick in <Mono>{nextIn !== null ? `${nextIn}s` : "—"}</Mono>
        </>
      }
    />
  );
}

function SchedulerCard({
  s,
  samples,
  now,
  processUptime,
}: {
  s: SchedulerHealth;
  samples: HealthSample[];
  now: Date;
  processUptime: number;
}) {
  const nextIn = secondsUntil(s.nextRunAt, now);
  const drifting = s.active && s.status === "degraded";

  return (
    <ServiceCard
      icon="clock"
      name="Scheduler"
      status={s.status}
      label={s.label}
      samples={samples}
      metrics={[
        { label: "State", value: s.active ? "Active" : "Paused", tone: s.active ? undefined : "warning" },
        { label: "Interval", value: `${s.intervalSeconds}s` },
        { label: "Drift", value: `${s.driftMs >= 0 ? "+" : ""}${s.driftMs}ms`, tone: drifting ? "warning" : undefined },
      ]}
      message={
        !s.active ? (
          <InlineMessage
            tone="warning"
            action={
              <Button variant="primary" size="sm" {...modalTrigger(RESUME_MODAL)}>
                Resume
              </Button>
            }
          >
            Scheduler is paused — no data is being collected
          </InlineMessage>
        ) : drifting ? (
          <InlineMessage tone="warning">Scheduler drift high — collector may be blocking</InlineMessage>
        ) : undefined
      }
      meta={
        <>
          Next run in <Mono>{nextIn !== null ? `${nextIn}s` : "—"}</Mono> · process uptime{" "}
          <Mono>{formatHoursMinutes(processUptime)}</Mono>
        </>
      }
    />
  );
}

function EventsCard({ events }: { events: InternalEvent[] }) {
  return (
    <Card padded={false} title="Recent Internal Events" class="overflow-hidden">
      <Table
        caption="Recent internal events, newest first"
        scrollClass="max-h-96 overflow-y-auto"
        head={
          <>
            <Th>Time</Th>
            <Th>Service</Th>
            <Th>Event</Th>
            <Th>Severity</Th>
            <Th>Detail</Th>
          </>
        }
      >
        {events.length === 0 ? (
          <TableEmptyRow colSpan={5}>
            <p class="text-fg-secondary flex items-center justify-center gap-2 px-6 py-8 text-sm">
              <Icon name="check-circle" class="text-fg-muted" />
              No internal events in the last hour. All quiet.
            </p>
          </TableEmptyRow>
        ) : (
          events.map((e) => (
            <Tr>
              <Td density="compact" class="text-fg-muted font-mono text-xs">
                {formatClock(e.at)}
              </Td>
              <Td density="compact">
                <StatusBadge variant="muted" label={serviceTag[e.service]} dot={false} />
              </Td>
              <Td density="compact">{e.event}</Td>
              <Td density="compact">
                <StatusBadge variant={severityVariant[e.severity]} label={e.severity} />
              </Td>
              <Td density="compact" class="max-w-xs truncate font-mono text-xs" title={e.detail ?? ""}>
                {e.detail ?? "—"}
              </Td>
            </Tr>
          ))
        )}
      </Table>
    </Card>
  );
}

function LastErrorModal({ error }: { error: CollectorHealth["lastError"] }) {
  return (
    <Modal
      id={LAST_ERROR_MODAL}
      title="Last collector error"
      size="wide"
      footer={
        <>
          <span />
          <Button variant="ghost" x-on:click="close()">
            Close
          </Button>
        </>
      }
    >
      {error ? (
        <div class="flex flex-col gap-4">
          <dl class="flex flex-col gap-2 text-sm">
            <div class="flex gap-4">
              <dt class="text-fg-muted w-24 shrink-0">Timestamp</dt>
              <dd class="text-fg font-mono">{formatTimestamp(error.at)} UTC</dd>
            </div>
            <div class="flex gap-4">
              <dt class="text-fg-muted w-24 shrink-0">Target</dt>
              <dd class="text-fg">{error.target}</dd>
            </div>
            <div class="flex gap-4">
              <dt class="text-fg-muted w-24 shrink-0">Message</dt>
              <dd class="text-fg">{error.message}</dd>
            </div>
          </dl>
          <CodeBlock
            size="xs"
            label="Error detail"
            code={JSON.stringify({ at: error.at.toISOString(), target: error.target, message: error.message }, null, 2)}
          />
        </div>
      ) : (
        <p class="text-fg-secondary text-base">No collector errors recorded since start-up.</p>
      )}
    </Modal>
  );
}

function ResumeModal() {
  return (
    <Modal
      id={RESUME_MODAL}
      title="Resume scheduler?"
      footer={
        <>
          <Button variant="ghost" x-on:click="close()">
            Cancel
          </Button>
          <Button variant="primary" loadingWhen="resuming" x-on:click="resume()">
            Resume
          </Button>
        </>
      }
    >
      <p class="text-fg-secondary text-base">Collection will resume on the next scheduled tick.</p>
    </Modal>
  );
}

function DiagnosticModal() {
  return (
    <Modal
      id={DIAGNOSTIC_MODAL}
      title="Full diagnostic"
      size="lg"
      footer={
        <>
          <span class="text-fg-muted text-xs">Secrets are redacted as ••••</span>
          <Button variant="ghost" x-on:click="close()">
            Close
          </Button>
        </>
      }
    >
      <CodeBlock alpineText="diagnostic" label="Health payload" maxHeightClass="max-h-96" />
    </Modal>
  );
}

/** Region re-rendered in place on every refresh (banner, cards, strips, events, footer). */
function LiveRegion({ report, history, events, now }: Omit<HealthPageProps, "user" | "systemStatus">) {
  const { metadata, collector, scheduler } = report.services;
  const levels = [metadata.status, collector.status, scheduler.status];
  const healthy = levels.filter((l) => l === "healthy").length;

  return (
    <div id="health-live" class="flex flex-col gap-6">
      <StatusBanner
        status={levelVariant[report.status]}
        headline={banner[report.status]}
        subline={`${healthy}/${levels.length} services healthy · checked ${formatRelative(report.checkedAt, now)}`}
        action={
          <Button variant="ghost" icon="activity" {...modalTrigger(DIAGNOSTIC_MODAL)}>
            Run full diagnostic
          </Button>
        }
      />

      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <MetadataCard s={metadata} samples={history.metadata} now={now} />
        <CollectorCard s={collector} samples={history.collector} now={now} />
        <SchedulerCard s={scheduler} samples={history.scheduler} now={now} processUptime={report.app.uptimeSeconds} />
      </div>

      <EventsCard events={events} />

      <div class="text-fg-muted flex flex-wrap items-center justify-between gap-4 text-sm">
        <p>
          {APP_NAME} v{report.app.version} · Node <Mono>{report.app.node.replace(/^v/, "")}</Mono> · Uptime{" "}
          <Mono>{formatHoursMinutes(report.app.uptimeSeconds)}</Mono> · Environment: {report.app.environment}
        </p>
        <Button variant="ghost" size="sm" icon="info" {...modalTrigger(DIAGNOSTIC_MODAL)}>
          Health payload
        </Button>
      </div>

      <LastErrorModal error={collector.lastError} />
      <ResumeModal />
    </div>
  );
}

/**
 * page behaviour: 30s countdown + draining bar, in-place
 * refresh of #health-live (skipped while a modal is open), manual refresh with forced
 * re-check, copy status JSON, diagnostic modal fetch, scheduler resume.
 */
const pageScript = /* js */ `
document.addEventListener("alpine:init", function () {
  Alpine.data("healthPage", function () {
    return {
      remaining: ${REFRESH_SECONDS},
      refreshing: false,
      resuming: false,
      openModals: 0,
      diagnostic: "Running diagnostic…",
      root: {
        "@open-modal.window": function (e) {
          this.openModals++;
          if (e.detail === "${DIAGNOSTIC_MODAL}") this.loadDiagnostic();
        },
        "@modal-closed.window": function () { this.openModals = Math.max(0, this.openModals - 1); },
      },
      init: function () {
        var self = this;
        setInterval(function () {
          if (self.refreshing) return;
          self.remaining = Math.max(0, self.remaining - 1);
          if (self.remaining === 0) {
            if (document.visibilityState === "visible" && self.openModals === 0) self.refresh(false);
            else self.remaining = ${REFRESH_SECONDS};
          }
        }, 1000);
      },
      get barWidth() { return "width: " + (this.remaining / ${REFRESH_SECONDS}) * 100 + "%"; },
      refresh: function (manual) {
        var self = this;
        if (this.refreshing) return;
        this.refreshing = true;
        fetch("/health" + (manual ? "?check=1" : ""), { credentials: "same-origin", headers: { Accept: "text/html" } })
          .then(function (res) {
            if (res.redirected && res.url.indexOf("/login") !== -1) { window.location.href = res.url; return null; }
            return res.text();
          })
          .then(function (html) {
            if (!html) return;
            var next = new DOMParser().parseFromString(html, "text/html").getElementById("health-live");
            var current = document.getElementById("health-live");
            if (next && current && (manual || self.openModals === 0)) current.replaceWith(next);
          })
          .catch(function () {
            Alpine.store("toasts").push("danger", "Couldn't refresh platform health.");
          })
          .finally(function () {
            self.refreshing = false;
            self.remaining = ${REFRESH_SECONDS};
          });
      },
      fetchJson: function (check) {
        return fetch("/health" + (check ? "?check=1" : ""), { credentials: "same-origin", headers: { Accept: "application/json" } })
          .then(function (res) { return res.json(); });
      },
      copyStatus: function () {
        this.fetchJson(false)
          .then(function (json) { return navigator.clipboard.writeText(JSON.stringify(json, null, 2)); })
          .then(function () { Alpine.store("toasts").push("success", "Status JSON copied"); })
          .catch(function () { Alpine.store("toasts").push("danger", "Couldn't copy status JSON."); });
      },
      loadDiagnostic: function () {
        var self = this;
        this.diagnostic = "Running diagnostic…";
        this.fetchJson(true)
          .then(function (json) { self.diagnostic = JSON.stringify(json, null, 2); })
          .catch(function () { self.diagnostic = "Diagnostic failed. Check the server logs."; });
      },
      resume: function () {
        var self = this;
        if (this.resuming) return;
        this.resuming = true;
        fetch("/health/scheduler/resume", { method: "POST", credentials: "same-origin", headers: { Accept: "application/json" } })
          .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
          .then(function (r) {
            self.$dispatch("close-modal", "${RESUME_MODAL}");
            Alpine.store("toasts").push(r.ok ? "success" : "danger", r.body.message || (r.ok ? "Scheduler resumed" : "Couldn't resume the scheduler."));
            self.refresh(true);
          })
          .catch(function () { Alpine.store("toasts").push("danger", "Couldn't resume the scheduler."); })
          .finally(function () { self.resuming = false; });
      },
    };
  });
});
`;

/** /health, internal platform health. */
export function HealthPage({ user, systemStatus, report, history, events, now }: HealthPageProps) {
  return (
    <AppLayout title="Platform Health" active="health" user={user} systemStatus={systemStatus}>
      <script dangerouslySetInnerHTML={{ __html: pageScript }} />
      <div class="flex flex-col gap-6" x-data="healthPage" x-bind="root">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-2xl">
            <h1 class="tracking-heading text-fg text-xl font-semibold">Platform Health</h1>
            <p class="text-fg-muted mt-1 text-sm">
              Internal status of QueryLens services — metadata database, collector, and scheduler.
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <div class="flex items-center gap-2">
              <Button variant="ghost" icon="refresh-cw" loadingWhen="refreshing" x-on:click="refresh(true)">
                Refresh
              </Button>
              <Button variant="ghost" icon="copy" x-on:click="copyStatus()">
                Copy status JSON
              </Button>
            </div>
            <div class="text-fg-muted flex items-center gap-2 text-xs">
              <StatusDot variant="success" pulse />
              <span>
                auto-refresh in{" "}
                <span class="font-mono" x-text="remaining">
                  {REFRESH_SECONDS}
                </span>
                s
              </span>
            </div>
            <div class="bg-subtle h-0.5 w-30 overflow-hidden rounded-full" aria-hidden="true">
              <div
                class="bg-accent h-full transition-all duration-1000 ease-linear"
                style="width: 100%"
                x-bind:style="barWidth"
              />
            </div>
          </div>
        </div>

        <LiveRegion report={report} history={history} events={events} now={now} />
        <DiagnosticModal />
      </div>
    </AppLayout>
  );
}
