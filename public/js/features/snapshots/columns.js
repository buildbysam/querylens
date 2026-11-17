// column derivation for the snapshot table: columns come from the first row's
// keys; every cell that looks like an ID, timestamp, duration, size or number is set in mono.

const MONO_KEY =
  /(^|_)(id|oid|pid|relid|indexrelid|datid|queryid|xid|lsn|ip|addr|port|size|bytes|time|start|query)($|_)|_at$|^backend_|^client_/;
const NUMERIC_TEXT = /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i;
const TIMESTAMP_TEXT = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;
const INTERVAL_TEXT = /^-?(\d+ days? )?\d{2}:\d{2}:\d{2}/;
const SAMPLE_ROWS = 50;

/** "xact_commit" → "Xact Commit". */
export function titleCase(key) {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** "numeric" (right-aligned mono), "mono" or "text", from the first non-null value and the key. */
export function columnKind(key, rows) {
  const sample = rows.slice(0, SAMPLE_ROWS).find((row) => row[key] !== null && row[key] !== undefined)?.[key];
  if (typeof sample === "number") return "numeric";
  if (typeof sample === "string" && NUMERIC_TEXT.test(sample)) return "numeric";
  if (typeof sample === "boolean" || (sample !== null && typeof sample === "object")) return "mono";
  if (typeof sample === "string" && (TIMESTAMP_TEXT.test(sample) || INTERVAL_TEXT.test(sample))) return "mono";
  if (MONO_KEY.test(key)) return "mono";
  return "text";
}

/** Columns for a snapshot payload, in the view's own column order. */
export function deriveColumns(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).map((key) => ({ key, label: titleCase(key), kind: columnKind(key, rows) }));
}

/** Cell text: "—" for NULL, JSON for arrays / objects. */
export function displayValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
