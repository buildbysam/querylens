// configured system views

export interface CollectedView {
  /** Stored as snapshots.view_name and shown as the segment label. */
  name: string;
  /** What the view reports (docs §5.3). */
  description: string;
  sql: string;
  /** Returns true when the view can be read on this database; otherwise it is omitted. */
  availabilityCheck?: string;
}

// upper bound on rows stored per view per cycle, so one busy database can't bloat storage
export const MAX_ROWS_PER_VIEW = 1000;

export const COLLECTED_VIEWS: CollectedView[] = [
  {
    name: "pg_stat_database",
    description: "Database statistics",
    sql: `SELECT * FROM pg_stat_database LIMIT ${MAX_ROWS_PER_VIEW}`,
  },
  {
    name: "pg_stat_activity",
    description: "Session activity",
    sql: `SELECT * FROM pg_stat_activity WHERE pid <> pg_backend_pid() LIMIT ${MAX_ROWS_PER_VIEW}`,
  },
  {
    name: "pg_stat_user_tables",
    description: "Table statistics",
    sql: `SELECT * FROM pg_stat_user_tables LIMIT ${MAX_ROWS_PER_VIEW}`,
  },
  {
    name: "pg_stat_user_indexes",
    description: "Index statistics",
    sql: `SELECT * FROM pg_stat_user_indexes LIMIT ${MAX_ROWS_PER_VIEW}`,
  },
  {
    name: "pg_stat_statements",
    description: "Statement statistics",
    sql: `SELECT * FROM pg_stat_statements LIMIT ${MAX_ROWS_PER_VIEW}`,
    availabilityCheck: "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') AS available",
  },
];

export const VIEW_NAMES = COLLECTED_VIEWS.map((v) => v.name);
