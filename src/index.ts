import { config } from "@/config.js";
import { health } from "@/modules/health/routes.js";
import { database } from "@/shared/db/client.js";
import { jsxMiddleware, staticMiddleware } from "@/shared/middleware/frontend.js";
import { loggerMiddleware } from "@/shared/middleware/logger.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const port = Number(config.getOrThrow("PORT"));
const app = new Hono();

app.use(loggerMiddleware);

// static files
app.use("/css/*", staticMiddleware);
app.use("/images/*", staticMiddleware);

// jsx renderer (excluding api)
app.use("*", async (c, next) => {
  if (c.req.path === "/api" || c.req.path.startsWith("/api/")) {
    return next();
  }
  return jsxMiddleware(c, next);
});

// routes
app.route("/health", health);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
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

function shutdown(signal: string) {
  console.log(`Received ${signal}, closing application...`);
  server.close(async (err) => {
    if (err) {
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
    await database.close();
    console.log("Application closed successfully!");
    process.exit(0);
  });
}
