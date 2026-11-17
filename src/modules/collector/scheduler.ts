import { config } from "@/config.js";
import { collectAll, type DatabaseCollectionResult } from "@/modules/collector/service.js";
import { recordEvent } from "@/shared/lib/internal-events.js";
import { logger } from "@/shared/middleware/logger.js";

// fixed-interval scheduler for the collector. One cycle at a time: a tick that
const HOUR_MS = 60 * 60 * 1000;
const DURATION_SAMPLES = 20;

export interface CycleError {
  at: Date;
  target: string;
  message: string;
}

export interface SchedulerSnapshot {
  active: boolean;
  running: boolean;
  intervalSeconds: number;
  startedAt: Date | null;
  nextRunAt: Date | null;
  lastTickAt: Date | null;
  lastCompletedAt: Date | null;
  lastDriftMs: number;
  averageTickMs: number | null;
  lastCycleFailed: boolean;
  lastError: CycleError | null;
  errorsLastHour: number;
  databasesCollected: number;
  databasesFailed: number;
  skippedOverlaps: number;
}

export interface SchedulerOptions {
  intervalMs: number;
  // one collection cycle.
  // must resolve with per-database results or throw for a cycle failure
  collect: () => Promise<DatabaseCollectionResult[]>;
}

export function createScheduler({ intervalMs, collect }: SchedulerOptions) {
  const state = {
    active: false,
    running: false,
    startedAt: null as Date | null,
    nextRunAt: null as Date | null,
    lastTickAt: null as Date | null,
    lastCompletedAt: null as Date | null,
    lastDriftMs: 0,
    lastResults: [] as DatabaseCollectionResult[],
    lastCycleFailed: false,
    lastError: null as CycleError | null,
    errorTimes: [] as number[],
    durations: [] as number[],
    skippedOverlaps: 0,
  };

  let timer: NodeJS.Timeout | null = null;
  let inFlight: Promise<void> | null = null;

  function pruneErrors(now: number) {
    state.errorTimes = state.errorTimes.filter((t) => now - t < HOUR_MS);
  }

  function recordError(error: CycleError) {
    state.lastError = error;
    state.errorTimes.push(error.at.getTime());
    pruneErrors(error.at.getTime());
  }

  async function runCycle(scheduledFor: Date) {
    const startedAt = new Date();
    state.lastTickAt = startedAt;
    state.lastDriftMs = startedAt.getTime() - scheduledFor.getTime();
    state.running = true;

    try {
      const results = await collect();
      state.lastResults = results;
      state.lastCycleFailed = false;
      for (const r of results.filter((r) => !r.ok)) {
        recordError({ at: new Date(), target: r.databaseName, message: r.error ?? "Collection failed" });
      }
    } catch (error) {
      // metadata DB unavailable or similar: the cycle as a whole failed
      state.lastCycleFailed = true;
      const message = error instanceof Error ? error.message : "Collection cycle failed";
      recordError({ at: new Date(), target: "collector", message });
      recordEvent({ service: "collector", event: "Collection cycle failed", severity: "critical", detail: message });
      logger.error("Collection cycle failed", error instanceof Error ? error : String(error), "collector");
    } finally {
      state.durations = [...state.durations, Date.now() - startedAt.getTime()].slice(-DURATION_SAMPLES);
      state.lastCompletedAt = new Date();
      state.running = false;
    }
  }

  function schedule(at: Date) {
    state.nextRunAt = at;
    timer = setTimeout(() => tick(at), Math.max(0, at.getTime() - Date.now()));
  }

  function tick(scheduledFor: Date) {
    if (!state.active) return;
    // next tick is anchored to the schedule, not to when this cycle finishes
    schedule(new Date(scheduledFor.getTime() + intervalMs));

    if (state.running) {
      state.skippedOverlaps += 1;
      logger.warn("Previous collection cycle still running; tick skipped", "collector");
      recordEvent({
        service: "scheduler",
        event: "Tick skipped",
        severity: "warning",
        detail: "previous cycle still running",
      });
      return;
    }
    inFlight = runCycle(scheduledFor).finally(() => {
      inFlight = null;
    });
  }

  return {
    intervalSeconds: intervalMs / 1000,

    /** Starts collection: first cycle immediately, then every interval. */
    start() {
      if (state.active) return;
      state.active = true;
      state.startedAt = new Date();
      logger.log(`Collector scheduled every ${intervalMs / 1000}s`, "collector");
      recordEvent({
        service: "scheduler",
        event: "Scheduler started",
        severity: "info",
        detail: `every ${intervalMs / 1000}s`,
      });
      tick(new Date());
    },

    /** Resumes a stopped scheduler. Returns false if it was already active. */
    resume(): boolean {
      if (state.active) return false;
      state.active = true;
      state.startedAt ??= new Date();
      logger.log("Scheduler resumed", "collector");
      recordEvent({ service: "scheduler", event: "Scheduler resumed", severity: "info" });
      // collection resumes on the next scheduled tick, not immediately (§5.4 confirmation copy)
      schedule(new Date(Date.now() + intervalMs));
      return true;
    },

    /** Stops scheduling and waits (bounded) for an in-flight cycle so connections close cleanly. */
    async stop(timeoutMs = 10_000) {
      state.active = false;
      state.nextRunAt = null;
      if (timer) clearTimeout(timer);
      timer = null;
      if (inFlight) {
        let guard: NodeJS.Timeout | undefined;
        await Promise.race([inFlight, new Promise((resolve) => (guard = setTimeout(resolve, timeoutMs)))]);
        clearTimeout(guard);
      }
    },

    snapshot(now = Date.now()): SchedulerSnapshot {
      pruneErrors(now);
      const avg = state.durations.length
        ? Math.round(state.durations.reduce((a, b) => a + b, 0) / state.durations.length)
        : null;
      return {
        active: state.active,
        running: state.running,
        intervalSeconds: intervalMs / 1000,
        startedAt: state.startedAt,
        nextRunAt: state.nextRunAt,
        lastTickAt: state.lastTickAt,
        lastCompletedAt: state.lastCompletedAt,
        lastDriftMs: state.lastDriftMs,
        averageTickMs: avg,
        lastCycleFailed: state.lastCycleFailed,
        lastError: state.lastError,
        errorsLastHour: state.errorTimes.length,
        databasesCollected: state.lastResults.filter((r) => r.ok).length,
        databasesFailed: state.lastResults.filter((r) => !r.ok).length,
        skippedOverlaps: state.skippedOverlaps,
      };
    },
  };
}

export type Scheduler = ReturnType<typeof createScheduler>;

/** The process-wide collector scheduler. */
const scheduler = createScheduler({
  intervalMs: Number(config.getOrThrow("COLLECTION_INTERVAL_SECONDS")) * 1000,
  collect: collectAll,
});

export const startScheduler = () => scheduler.start();
export const resumeScheduler = () => scheduler.resume();
export const stopScheduler = (timeoutMs?: number) => scheduler.stop(timeoutMs);
export const getSchedulerSnapshot = (now?: number) => scheduler.snapshot(now);
export const collectionIntervalSeconds = scheduler.intervalSeconds;
