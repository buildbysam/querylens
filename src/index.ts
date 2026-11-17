import { createApp } from "@/app.js";
import { config } from "@/config.js";
import { startScheduler, stopScheduler } from "@/modules/collector/scheduler.js";
import { startHealthSampler, stopHealthSampler } from "@/modules/health/sampler.js";
import { database } from "@/shared/db/client.js";
import { serve } from "@hono/node-server";

const port = Number(config.getOrThrow("PORT"));
const app = createApp();

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
  startScheduler();
  startHealthSampler();
});

// graceful shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// handle unexpected errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  shutdown("unhandledRejection");
});

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, closing application...`);
  server.close(async (err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    // let an in-flight collection cycle finish so target connections close cleanly
    stopHealthSampler();
    await stopScheduler();
    await database.close();
    console.log("Application closed successfully!");
    process.exit(0);
  });
}
