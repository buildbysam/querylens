import { config } from "@/config.js";
import { getSchedulerSnapshot, type SchedulerSnapshot } from "@/modules/collector/scheduler.js";
import { database } from "@/shared/db/client.js";
import { APP_VERSION } from "@/shared/lib/app-info.js";
import { logger } from "@/shared/middleware/logger.js";
import { sql } from "drizzle-orm";

// health of QueryLens itself: metadata database, collector, scheduler
// never reports monitored-database statistics

export type HealthLevel = "healthy" | "degraded" | "critical";

export const DB_SLOW_MS = 250;
export const DB_TIMEOUT_MS = 3_000;
export const DRIFT_LIMIT_MS = 5_000;

export interface MetadataHealth {
  status: HealthLevel;
  label: string;
  connected: boolean;
  latencyMs: number | null;
  pool: { used: number; total: number; waiting: number; max: number };
  checkedAt: Date;
  /** Safe message when disconnected. */
  error?: string;
}

export interface CollectorHealth {
  status: HealthLevel;
  label: string;
  running: number;
  failing: number;
  lastTickAt: Date | null;
  lastCompletedAt: Date | null;
  errorsLastHour: number;
  averageTickMs: number | null;
  intervalSeconds: number;
  nextRunAt: Date | null;
  stale: boolean;
  lastError: { at: Date; target: string; message: string } | null;
  lastCycleFailed: boolean;
  checkedAt: Date;
}

export interface SchedulerHealth {
  status: HealthLevel;
  label: string;
  active: boolean;
  intervalSeconds: number;
  driftMs: number;
  nextRunAt: Date | null;
  startedAt: Date | null;
  checkedAt: Date;
}

export interface HealthReport {
  status: HealthLevel;
  checkedAt: Date;
  services: { metadata: MetadataHealth; collector: CollectorHealth; scheduler: SchedulerHealth };
  app: { version: string; node: string; uptimeSeconds: number; environment: string };
}

const rank: Record<HealthLevel, number> = { healthy: 0, degraded: 1, critical: 2 };
export function worst(levels: HealthLevel[]): HealthLevel {
  return levels.reduce((a, b) => (rank[b] > rank[a] ? b : a), "healthy" as HealthLevel);
}

async function checkMetadata(now: Date): Promise<MetadataHealth> {
  const started = performance.now();
  try {
    await Promise.race([
      database.db.execute(sql`SELECT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS)),
    ]);
    const latencyMs = Math.round(performance.now() - started);
    const pool = database.poolStats();
    const slow = latencyMs >= DB_SLOW_MS || pool.waiting > 0;
    return {
      status: slow ? "degraded" : "healthy",
      label: slow ? "Degraded" : "Connected",
      connected: true,
      latencyMs,
      pool,
      checkedAt: now,
    };
  } catch (error) {
    const err = error as { code?: string; message?: string; cause?: { code?: string } };
    const code = err.code ?? err.cause?.code;
    const message =
      code === "ECONNREFUSED"
        ? "Connection refused"
        : err.message === "timeout"
          ? "Query timed out"
          : "Connection failed";
    logger.error(`Metadata database health check failed: ${message}`, undefined, "health");
    return {
      status: "critical",
      label: "Disconnected",
      connected: false,
      latencyMs: null,
      pool: database.poolStats(),
      checkedAt: now,
      error: message,
    };
  }
}

function checkCollector(s: SchedulerSnapshot, now: Date): CollectorHealth {
  const reference = s.lastCompletedAt ?? s.startedAt;
  const stale = s.active && reference !== null && now.getTime() - reference.getTime() > 2 * s.intervalSeconds * 1000;
  const idle = !s.active;
  const status: HealthLevel = s.lastCycleFailed ? "critical" : stale || idle ? "degraded" : "healthy";
  const label = s.lastCycleFailed ? "Failed" : stale || idle ? "Stale" : "Running";
  return {
    status,
    label,
    running: s.databasesCollected,
    failing: s.databasesFailed,
    lastTickAt: s.lastTickAt,
    lastCompletedAt: s.lastCompletedAt,
    errorsLastHour: s.errorsLastHour,
    averageTickMs: s.averageTickMs,
    intervalSeconds: s.intervalSeconds,
    nextRunAt: s.nextRunAt,
    stale,
    lastError: s.lastError,
    lastCycleFailed: s.lastCycleFailed,
    checkedAt: now,
  };
}

function checkScheduler(s: SchedulerSnapshot, now: Date): SchedulerHealth {
  const drifting = Math.abs(s.lastDriftMs) > DRIFT_LIMIT_MS;
  const status: HealthLevel = !s.active || drifting ? "degraded" : "healthy";
  return {
    status,
    label: !s.active ? "Paused" : drifting ? "Degraded" : "Active",
    active: s.active,
    intervalSeconds: s.intervalSeconds,
    driftMs: s.lastDriftMs,
    nextRunAt: s.nextRunAt,
    startedAt: s.startedAt,
    checkedAt: now,
  };
}

/** Runs all three checks now. */
export async function runHealthChecks(): Promise<HealthReport> {
  const now = new Date();
  const scheduler = getSchedulerSnapshot(now.getTime());
  const services = {
    metadata: await checkMetadata(now),
    collector: checkCollector(scheduler, now),
    scheduler: checkScheduler(scheduler, now),
  };
  return {
    status: worst([services.metadata.status, services.collector.status, services.scheduler.status]),
    checkedAt: now,
    services,
    app: {
      version: APP_VERSION,
      node: process.version,
      uptimeSeconds: Math.floor(process.uptime()),
      environment: config.getOrThrow("NODE_ENV"),
    },
  };
}

const REDACTED = "••••";
const SECRET_KEY = /pass|secret|token|key|dsn|url|connection|credential/i;

/** JSON payload for /health (Accept: application/json) and the diagnostic modal. Secrets redacted. */
export function toHealthPayload(report: HealthReport): unknown {
  const redact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(redact);
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, SECRET_KEY.test(k) ? REDACTED : redact(v)]));
    }
    return value;
  };
  return redact(report);
}
