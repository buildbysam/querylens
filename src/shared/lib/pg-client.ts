import pg from "pg";

/**
 * short-lived, read-only connections to monitored databases
 * every session is forced read-only and time-limited, and is always closed.
 */

export interface TargetConnection {
  host: string;
  port: number;
  databaseName: string;
  username: string;
  /** Plain password, decrypted by the caller immediately before connecting. */
  password: string;
}

const CONNECT_TIMEOUT_MS = 5_000;
const STATEMENT_TIMEOUT_MS = 10_000;

/** Type OIDs converted to JSON scalars; every other type is kept as PostgreSQL's raw text. */
const OID = {
  bool: 16,
  int8: 20,
  int2: 21,
  int4: 23,
  oid: 26,
  float4: 700,
  float8: 701,
  numeric: 1700,
  xid: 28,
} as const;

function toNumber(value: string): number | string {
  const n = Number(value);
  // keep precision: values outside the safe integer range stay as text
  return Number.isFinite(n) && (!Number.isInteger(n) || Number.isSafeInteger(n)) ? n : value;
}

/**
 * Collected rows are stored without transformation, so values stay as the
 * server sent them: timestamps, intervals, inet, arrays… remain text; numbers and
 * booleans become JSON numbers / booleans.
 */
const rawTypes = {
  getTypeParser: ((oid: number) => {
    switch (oid) {
      case OID.bool:
        return (value: string) => value === "t";
      case OID.int2:
      case OID.int4:
      case OID.int8:
      case OID.oid:
      case OID.xid:
      case OID.float4:
      case OID.float8:
      case OID.numeric:
        return toNumber;
      default:
        return (value: string) => value;
    }
  }) as pg.CustomTypesConfig["getTypeParser"],
};

export async function withTargetClient<T>(target: TargetConnection, fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({
    host: target.host,
    port: target.port,
    database: target.databaseName,
    user: target.username,
    password: target.password,
    application_name: "querylens",
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: STATEMENT_TIMEOUT_MS,
    options: "-c default_transaction_read_only=on",
    types: rawTypes,
  });
  // errors emitted after connect (e.g. server restart) must not crash the process
  client.on("error", () => {});

  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * Maps a connection error to a short, safe reason. Never includes credentials,
 * connection strings or raw server messages.
 */
export function describeConnectionError(error: unknown): string {
  const err = error as { code?: string; message?: string };
  switch (err?.code) {
    case "ECONNREFUSED":
      return "Connection refused";
    case "ENOTFOUND":
    case "EAI_AGAIN":
      return "Host not found";
    case "ETIMEDOUT":
    case "ECONNRESET":
    case "EHOSTUNREACH":
    case "ENETUNREACH":
      return "Host unreachable";
    case "28P01":
      return "Authentication failed";
    case "28000":
      return "Access denied for this user";
    case "3D000":
      return "Database does not exist";
    case "53300":
      return "Too many connections";
    case "57P03":
      return "Server is starting up or shutting down";
    case "42501":
      return "Insufficient privilege";
  }
  if (typeof err?.message === "string" && /timeout/i.test(err.message)) return "Connection timed out";
  if (typeof err?.message === "string" && /ssl|tls/i.test(err.message)) return "SSL negotiation failed";
  return "Could not connect";
}
