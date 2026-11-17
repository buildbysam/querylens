import { COLLECTED_VIEWS, VIEW_NAMES } from "@/modules/collector/views.js";
import { database } from "@/shared/db/client.js";
import { databases, snapshots } from "@/shared/db/schema.js";
import { and, desc, eq, inArray } from "drizzle-orm";

// read-only access to stored collections
// Nothing here writes.

export interface ViewInfo {
  name: string;
  description: string;
  /** True when at least one snapshot of this view exists for the database. */
  available: boolean;
}

export interface SnapshotRecord {
  id: string;
  viewName: string;
  capturedAt: Date;
  rowCount: number;
  payload: Record<string, unknown>[];
}

const snapshotColumns = {
  id: snapshots.id,
  viewName: snapshots.viewName,
  capturedAt: snapshots.capturedAt,
  rowCount: snapshots.rowCount,
  payload: snapshots.payload,
};

export async function databaseExists(databaseId: string) {
  const [row] = await database.db
    .select({ id: databases.id })
    .from(databases)
    .where(eq(databases.id, databaseId))
    .limit(1);
  return !!row;
}

/** Configured views, flagged by whether this database has any snapshot of them. */
export async function listViews(databaseId?: string): Promise<ViewInfo[]> {
  const present = new Set<string>();
  if (databaseId) {
    const rows = await database.db
      .selectDistinct({ viewName: snapshots.viewName })
      .from(snapshots)
      .where(eq(snapshots.databaseId, databaseId));
    rows.forEach((r) => present.add(r.viewName));
  }
  return COLLECTED_VIEWS.map((v) => ({
    name: v.name,
    description: v.description,
    available: databaseId ? present.has(v.name) : true,
  }));
}

/** Most recent snapshot per view (optionally a single view) for a database. */
export async function latestSnapshots(databaseId: string, viewName?: string): Promise<SnapshotRecord[]> {
  const rows = await database.db
    .selectDistinctOn([snapshots.viewName], snapshotColumns)
    .from(snapshots)
    .where(
      and(
        eq(snapshots.databaseId, databaseId),
        viewName ? eq(snapshots.viewName, viewName) : inArray(snapshots.viewName, VIEW_NAMES)
      )
    )
    .orderBy(snapshots.viewName, desc(snapshots.capturedAt));
  const order = new Map(VIEW_NAMES.map((name, i) => [name, i]));
  return (rows as SnapshotRecord[]).sort((a, b) => (order.get(a.viewName) ?? 99) - (order.get(b.viewName) ?? 99));
}

/** Recent snapshots of one view, newest first. */
export async function recentSnapshots(databaseId: string, viewName: string, limit: number): Promise<SnapshotRecord[]> {
  const rows = await database.db
    .select(snapshotColumns)
    .from(snapshots)
    .where(and(eq(snapshots.databaseId, databaseId), eq(snapshots.viewName, viewName)))
    .orderBy(desc(snapshots.capturedAt))
    .limit(limit);
  return rows as SnapshotRecord[];
}
