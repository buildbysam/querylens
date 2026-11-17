import { runHealthChecks, type HealthLevel, type HealthReport } from "@/modules/health/service.js";
import { recordEvent, type InternalService } from "@/shared/lib/internal-events.js";
import { logger } from "@/shared/middleware/logger.js";

/**
 * Samples platform health every 30s (decision 6): keeps the latest report, the last 40
 * results per service for the timeline strips, and logs an internal event whenever a
 * service changes status.
 */

const SAMPLE_INTERVAL_MS = 30_000;
const HISTORY = 40;

export interface HealthSample {
  at: Date;
  status: HealthLevel;
  latencyMs?: number;
}

type ServiceKey = keyof HealthReport["services"];

const serviceNames: Record<ServiceKey, { event: InternalService; name: string }> = {
  metadata: { event: "metadata", name: "Metadata database" },
  collector: { event: "collector", name: "Collector" },
  scheduler: { event: "scheduler", name: "Scheduler" },
};

const history: Record<ServiceKey, HealthSample[]> = { metadata: [], collector: [], scheduler: [] };
let latest: HealthReport | null = null;
let timer: NodeJS.Timeout | null = null;
let pending: Promise<HealthReport> | null = null;

function latencyOf(key: ServiceKey, report: HealthReport): number | undefined {
  const s = report.services;
  if (key === "metadata") return s.metadata.latencyMs ?? undefined;
  if (key === "collector") return s.collector.averageTickMs ?? undefined;
  return Math.abs(s.scheduler.driftMs);
}

function record(report: HealthReport) {
  for (const key of Object.keys(history) as ServiceKey[]) {
    const service = report.services[key];
    const previous = latest?.services[key];
    if (previous && previous.status !== service.status) {
      const { event, name } = serviceNames[key];
      const severity = service.status === "critical" ? "critical" : service.status === "degraded" ? "warning" : "info";
      const verb = service.status === "healthy" ? "recovered" : service.status === "degraded" ? "degraded" : "is down";
      const detail = "error" in service && service.error ? service.error : service.label;
      recordEvent({ service: event, event: `${name} ${verb}`, severity, detail });
    }
    history[key] = [
      ...history[key],
      { at: report.checkedAt, status: service.status, latencyMs: latencyOf(key, report) },
    ].slice(-HISTORY);
  }
  latest = report;
}

/** Runs the checks now and records the sample (manual refresh / full diagnostic). */
export function sampleNow(): Promise<HealthReport> {
  pending ??= runHealthChecks()
    .then((report) => {
      record(report);
      return report;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

/** Latest report, sampling first if there is none yet. */
export async function getLatestReport(): Promise<HealthReport> {
  return latest ?? sampleNow();
}

export function getHistory(): Record<ServiceKey, HealthSample[]> {
  return history;
}

export function startHealthSampler() {
  if (timer) return;
  sampleNow().catch((error) =>
    logger.error("Health sample failed", error instanceof Error ? error : String(error), "health")
  );
  timer = setInterval(() => {
    sampleNow().catch((error) =>
      logger.error("Health sample failed", error instanceof Error ? error : String(error), "health")
    );
  }, SAMPLE_INTERVAL_MS);
}

export function stopHealthSampler() {
  if (timer) clearInterval(timer);
  timer = null;
}

const levelToStatus = { healthy: "success", degraded: "warning", critical: "danger" } as const;
const levelToLabel = { healthy: "System healthy", degraded: "Degraded", critical: "Platform down" } as const;

/** Sidebar status row: overall status of the latest sample (no extra query per page). */
export async function getPlatformStatus() {
  const report = await getLatestReport();
  return { variant: levelToStatus[report.status], label: levelToLabel[report.status] };
}
