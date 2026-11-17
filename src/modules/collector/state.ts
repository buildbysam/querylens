// in-memory result of the most recent collection attempt per database
// not persisted: after a restart every database is "pending" until the next cycle

export interface DatabaseCollectionStatus {
  reachable: boolean;
  checkedAt: Date;
  /** pg_postmaster_start_time() of the target, when reachable. */
  serverStartedAt?: Date;
  /** Number of views collected in the last successful cycle. */
  viewsAvailable?: number;
  /** Safe, credential-free failure reason. */
  lastError?: string;
}

const statuses = new Map<string, DatabaseCollectionStatus>();

export function recordDatabaseStatus(databaseId: string, status: DatabaseCollectionStatus) {
  statuses.set(databaseId, status);
}

export function getDatabaseStatus(databaseId: string): DatabaseCollectionStatus | undefined {
  return statuses.get(databaseId);
}
