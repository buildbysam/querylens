import { getDatabaseStatus } from "@/modules/collector/state.js";
import type { ConnectionState, DatabaseInput, DatabaseSummary } from "@/modules/databases/types.js";
import { database } from "@/shared/db/client.js";
import { databases, snapshots } from "@/shared/db/schema.js";
import { encryptSecret } from "@/shared/lib/crypto.js";
import { describeConnectionError, withTargetClient } from "@/shared/lib/pg-client.js";
import { logger } from "@/shared/middleware/logger.js";
import { asc, max } from "drizzle-orm";

// columns safe to select — protected_password is excluded
const publicColumns = {
  id: databases.id,
  name: databases.name,
  host: databases.host,
  port: databases.port,
  databaseName: databases.databaseName,
  username: databases.username,
  createdAt: databases.createdAt,
};

export async function listDatabases(now = new Date()): Promise<DatabaseSummary[]> {
  const [rows, collected] = await Promise.all([
    database.db.select(publicColumns).from(databases).orderBy(asc(databases.name), asc(databases.createdAt)),
    database.db
      .select({ databaseId: snapshots.databaseId, lastCollectedAt: max(snapshots.capturedAt) })
      .from(snapshots)
      .groupBy(snapshots.databaseId),
  ]);
  const lastCollected = new Map(collected.map((c) => [c.databaseId, c.lastCollectedAt]));

  return rows.map((row) => {
    const status = getDatabaseStatus(row.id);
    const state: ConnectionState = !status ? "pending" : status.reachable ? "connected" : "unreachable";
    return {
      ...row,
      state,
      checkedAt: status?.checkedAt ?? null,
      uptimeSeconds:
        status?.reachable && status.serverStartedAt
          ? Math.floor((now.getTime() - status.serverStartedAt.getTime()) / 1000)
          : null,
      viewsAvailable: status?.reachable ? (status.viewsAvailable ?? null) : null,
      lastCollectedAt: lastCollected.get(row.id) ?? null,
    };
  });
}

export interface ConnectionTestResult {
  ok: boolean;
  /** Safe failure reason; absent on success. */
  reason?: string;
  serverVersion?: string;
}

// connects read-only and runs a trivial query. Credentials never appear in the result or logs
export async function testConnection(input: DatabaseInput): Promise<ConnectionTestResult> {
  try {
    const serverVersion = await withTargetClient(input, async (client) => {
      const result = await client.query<{ server_version: string }>("SHOW server_version");
      return result.rows[0]?.server_version;
    });
    return { ok: true, serverVersion };
  } catch (error) {
    const reason = describeConnectionError(error);
    logger.warn(`Connection test to ${input.host}:${input.port}/${input.databaseName} failed: ${reason}`, "databases");
    return { ok: false, reason };
  }
}

export async function registerDatabase(input: DatabaseInput) {
  const [row] = await database.db
    .insert(databases)
    .values({
      name: input.name,
      host: input.host,
      port: input.port,
      databaseName: input.databaseName,
      username: input.username,
      protectedPassword: encryptSecret(input.password),
    })
    .returning(publicColumns);
  logger.log(`Registered database "${input.name}" (${input.host}:${input.port}/${input.databaseName})`, "databases");
  return row!;
}
