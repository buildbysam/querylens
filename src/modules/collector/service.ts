import { getDatabaseStatus, recordDatabaseStatus, type DatabaseCollectionStatus } from "@/modules/collector/state.js";
import { COLLECTED_VIEWS } from "@/modules/collector/views.js";
import { database } from "@/shared/db/client.js";
import { databases, snapshots } from "@/shared/db/schema.js";
import { decryptSecret } from "@/shared/lib/crypto.js";
import { recordEvent } from "@/shared/lib/internal-events.js";
import { describeConnectionError, withTargetClient } from "@/shared/lib/pg-client.js";
import { logger } from "@/shared/middleware/logger.js";

type RegisteredDatabase = typeof databases.$inferSelect;

export interface DatabaseCollectionResult {
  databaseId: string;
  databaseName: string;
  ok: boolean;
  viewsCollected: number;
  viewsOmitted: string[];
  /** Safe reason when the database could not be collected. */
  error?: string;
}

/** Records the status and logs an internal event only when reachability changes. */
function updateStatus(db: RegisteredDatabase, status: DatabaseCollectionStatus) {
  const previous = getDatabaseStatus(db.id);
  recordDatabaseStatus(db.id, status);
  if (!status.reachable && (previous === undefined || previous.reachable)) {
    recordEvent({
      service: "collector",
      event: "Collection failed for a database",
      severity: "warning",
      detail: `${db.name}: ${status.lastError}`,
    });
  } else if (status.reachable && previous && !previous.reachable) {
    recordEvent({ service: "collector", event: "Database collection recovered", severity: "info", detail: db.name });
  }
}

const OMITTABLE_CODES = new Set(["42P01", "42501", "55000", "0A000", "42883"]);

/**
 * One database, one cycle: connect read-only, read every available view, store one
 * snapshot per view, disconnect. Never throws: failures are returned and recorded.
 */
export async function collectDatabase(db: RegisteredDatabase): Promise<DatabaseCollectionResult> {
  const capturedAt = new Date();
  const omitted: string[] = [];

  let password: string;
  try {
    password = decryptSecret(db.protectedPassword);
  } catch {
    const reason = "Stored credentials can't be decrypted (was ENCRYPTION_KEY changed?)";
    updateStatus(db, { reachable: false, checkedAt: capturedAt, lastError: reason });
    logger.error(`Collection from "${db.name}" skipped: ${reason}`, undefined, "collector");
    return { databaseId: db.id, databaseName: db.name, ok: false, viewsCollected: 0, viewsOmitted: [], error: reason };
  }

  try {
    const { rows, serverStartedAt } = await withTargetClient(
      { host: db.host, port: db.port, databaseName: db.databaseName, username: db.username, password },
      async (client) => {
        const started = await client.query<{ started: number }>(
          "SELECT extract(epoch FROM pg_postmaster_start_time()) AS started"
        );
        const collected: { viewName: string; payload: Record<string, unknown>[] }[] = [];

        for (const view of COLLECTED_VIEWS) {
          try {
            if (view.availabilityCheck) {
              const check = await client.query<{ available: boolean }>(view.availabilityCheck);
              if (!check.rows[0]?.available) {
                omitted.push(view.name);
                continue;
              }
            }
            const result = await client.query(view.sql);
            collected.push({ viewName: view.name, payload: result.rows });
          } catch (error) {
            const code = (error as { code?: string }).code;
            if (!code || !OMITTABLE_CODES.has(code)) {
              logger.warn(
                `View ${view.name} failed on "${db.name}" (${code ?? "unknown"}); omitted this cycle`,
                "collector"
              );
            }
            omitted.push(view.name);
          }
        }

        const epoch = started.rows[0]?.started;
        return { rows: collected, serverStartedAt: typeof epoch === "number" ? new Date(epoch * 1000) : undefined };
      }
    );

    if (rows.length > 0) {
      await database.db.insert(snapshots).values(
        rows.map((r) => ({
          databaseId: db.id,
          viewName: r.viewName,
          capturedAt,
          payload: r.payload,
          rowCount: r.payload.length,
        }))
      );
    }

    updateStatus(db, { reachable: true, checkedAt: capturedAt, serverStartedAt, viewsAvailable: rows.length });
    return { databaseId: db.id, databaseName: db.name, ok: true, viewsCollected: rows.length, viewsOmitted: omitted };
  } catch (error) {
    const reason = describeConnectionError(error);
    updateStatus(db, { reachable: false, checkedAt: capturedAt, lastError: reason });
    logger.warn(`Collection from "${db.name}" failed: ${reason}`, "collector");
    return {
      databaseId: db.id,
      databaseName: db.name,
      ok: false,
      viewsCollected: 0,
      viewsOmitted: omitted,
      error: reason,
    };
  }
}

const CONCURRENCY = 4;

/** Collects every registered database; one failure never stops the others (docs §5.4). */
export async function collectAll(): Promise<DatabaseCollectionResult[]> {
  const registered = await database.db.select().from(databases);
  const results: DatabaseCollectionResult[] = [];
  let index = 0;

  async function worker() {
    while (index < registered.length) {
      const db = registered[index++]!;
      results.push(await collectDatabase(db));
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, registered.length) }, worker));
  return results;
}
