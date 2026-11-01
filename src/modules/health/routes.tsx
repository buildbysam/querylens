import { HealthPage } from "@/modules/health/views.js";
import { Hono } from "hono";

export const health = new Hono();

health.get("/", (ctx) => {
  return ctx.render(<HealthPage message="Everything is fine." />, { title: "Health" });
});
