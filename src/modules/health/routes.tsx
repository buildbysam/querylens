import { checkHealth } from "@/modules/health/service.js";
import { HealthPage } from "@/modules/health/views.js";
import { Hono } from "hono";

export const health = new Hono();

health.get("/", async (c) => {
  const services = await checkHealth();

  return c.render(<HealthPage {...services} />, { title: "Service Health" });
});
