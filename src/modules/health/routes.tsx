import type { IApiResponse } from "@/config.js";
import { resumeScheduler } from "@/modules/collector/scheduler.js";
import { getHistory, getLatestReport, sampleNow } from "@/modules/health/sampler.js";
import { toHealthPayload } from "@/modules/health/service.js";
import { HealthPage } from "@/modules/pages/HealthPage.js";
import { recentEvents } from "@/shared/lib/internal-events.js";
import { wantsJson } from "@/shared/middleware/auth.js";
import type { AppEnv } from "@/types.js";
import { Hono } from "hono";

// mounted at /health
// requires a session
export const health = new Hono<AppEnv>();

const HOUR_MS = 60 * 60 * 1000;
const MAX_EVENTS_SHOWN = 50;
const statusOf = { healthy: "success", degraded: "warning", critical: "danger" } as const;
const labelOf = { healthy: "System healthy", degraded: "Degraded", critical: "Platform down" } as const;

/**
 * GET /health — page, or JSON when the client asks for application/json (decision 6).
 * `?check=1` runs the checks now instead of using the latest 30s sample.
 * JSON responds 503 when the platform is critical so external probes can use it.
 */
health.get("/", async (c) => {
  const report = c.req.query("check") === "1" ? await sampleNow() : await getLatestReport();

  if (wantsJson(c)) {
    return c.json(toHealthPayload(report) as object, report.status === "critical" ? 503 : 200);
  }

  const user = c.get("user");
  return c.render(
    <HealthPage
      user={{ name: user.name, email: user.email }}
      systemStatus={{ variant: statusOf[report.status], label: labelOf[report.status] }}
      report={report}
      history={getHistory()}
      events={recentEvents(HOUR_MS).slice(0, MAX_EVENTS_SHOWN)}
      now={new Date()}
    />
  );
});

/** POST /health/scheduler/resume — the only state-changing health action (decision 7). */
health.post("/scheduler/resume", async (c) => {
  const resumed = resumeScheduler();
  await sampleNow();
  return c.json<IApiResponse<{ resumed: boolean }>>({
    success: true,
    statusCode: 200,
    message: resumed ? "Scheduler resumed" : "Scheduler is already active",
    data: { resumed },
  });
});
