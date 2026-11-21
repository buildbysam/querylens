import { database } from "@/shared/db/client.js";
import { sql } from "drizzle-orm";
import { Hono } from "hono";

/**
 * unauthenticated container/orchestrator probes. mounted before CSRF, rate limiting,
 * access logging and auth, and expose nothing beyond a status word.
 *   GET /healthz  liveness  — the process is up and serving HTTP (no dependencies checked)
 *   GET /readyz   readiness — the metadata database answers; 503 otherwise
 */

export const probes = new Hono();

const READY_TIMEOUT_MS = 2_000;

probes.get("/healthz", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ status: "ok" });
});

probes.get("/readyz", async (c) => {
  c.header("Cache-Control", "no-store");
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      database.db.execute(sql`SELECT 1`),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), READY_TIMEOUT_MS);
      }),
    ]);
    return c.json({ status: "ready" });
  } catch {
    return c.json({ status: "unavailable" }, 503);
  } finally {
    clearTimeout(timer);
  }
});
