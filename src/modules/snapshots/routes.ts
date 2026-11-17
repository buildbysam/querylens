import type { IApiResponse } from "@/config.js";
import { VIEW_NAMES } from "@/modules/collector/views.js";
import { databaseExists, latestSnapshots, listViews, recentSnapshots } from "@/modules/snapshots/service.js";
import type { AppEnv } from "@/types.js";
import { Hono, type Context } from "hono";
import { z } from "zod";

// read-only snapshot endpoints
// mounted at /api; requires a session
export const snapshotsApi = new Hono<AppEnv>();

const databaseParam = z.uuid("database must be a valid id");
const viewParam = z.enum(VIEW_NAMES as [string, ...string[]], {
  message: `view must be one of: ${VIEW_NAMES.join(", ")}`,
});

function fail(c: Context, status: 400 | 404, message: string) {
  return c.json<IApiResponse<never>>({ success: false, statusCode: status, message }, status);
}

async function resolveDatabase(c: Context, raw: string | undefined) {
  const parsed = databaseParam.safeParse(raw);
  if (!parsed.success) return { error: fail(c, 400, parsed.error.issues[0]!.message) };
  if (!(await databaseExists(parsed.data))) return { error: fail(c, 404, "Database not found") };
  return { id: parsed.data };
}

/** GET /api/views[?database=<id>] — views available for display. */
snapshotsApi.get("/views", async (c) => {
  const raw = c.req.query("database");
  let databaseId: string | undefined;
  if (raw !== undefined) {
    const db = await resolveDatabase(c, raw);
    if (db.error) return db.error;
    databaseId = db.id;
  }
  const data = await listViews(databaseId);
  return c.json<IApiResponse<typeof data>>({ success: true, statusCode: 200, message: "OK", data });
});

/** GET /api/snapshots?database=<id>&view=<name>[&limit=1..20] — recent snapshots, newest first. */
snapshotsApi.get("/snapshots", async (c) => {
  const db = await resolveDatabase(c, c.req.query("database"));
  if (db.error) return db.error;
  const view = viewParam.safeParse(c.req.query("view"));
  if (!view.success) return fail(c, 400, view.error.issues[0]!.message);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .catch(5)
    .parse(c.req.query("limit") ?? 5);

  const data = await recentSnapshots(db.id, view.data, limit);
  return c.json<IApiResponse<typeof data>>({ success: true, statusCode: 200, message: "OK", data });
});

/** GET /api/snapshots/latest?database=<id>[&view=<name>] — latest snapshot per view. Polled by the page. */
snapshotsApi.get("/snapshots/latest", async (c) => {
  const db = await resolveDatabase(c, c.req.query("database"));
  if (db.error) return db.error;
  const rawView = c.req.query("view");
  let viewName: string | undefined;
  if (rawView !== undefined) {
    const view = viewParam.safeParse(rawView);
    if (!view.success) return fail(c, 400, view.error.issues[0]!.message);
    viewName = view.data;
  }
  const data = await latestSnapshots(db.id, viewName);
  return c.json<IApiResponse<typeof data>>({ success: true, statusCode: 200, message: "OK", data });
});
