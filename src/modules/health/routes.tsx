import { HealthPage } from "@/modules/health/views.js";
import { Hono } from "hono";

const health = new Hono();

health.get("/", (ctx) => {
  return ctx.html(<HealthPage message="Everything is fine." />);
});

export default health;
