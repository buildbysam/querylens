import { auth } from "@/modules/auth/routes.js";
import { databasesApi } from "@/modules/databases/routes.js";
import { probes } from "@/modules/health/probes.js";
import { health } from "@/modules/health/routes.js";
import { pages } from "@/modules/pages/routes.js";
import { snapshotsApi } from "@/modules/snapshots/routes.js";
import { authMiddleware } from "@/shared/middleware/auth.js";
import { csrfMiddleware } from "@/shared/middleware/csrf.js";
import { notFound, onError } from "@/shared/middleware/errors.js";
import { jsxMiddleware, staticMiddleware } from "@/shared/middleware/frontend.js";
import { loggerMiddleware } from "@/shared/middleware/logger.js";
import { rateLimitMiddleware } from "@/shared/middleware/rate-limit.js";
import { requestIdMiddleware } from "@/shared/middleware/request-id.js";
import { FAVICON, STATIC_DIRS } from "@/shared/views/assets.js";
import type { AppEnv } from "@/types.js";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { secureHeaders } from "hono/secure-headers";

/** Requests per IP per window (decision 11): static assets are exempt; signed-in browsers poll. */
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const RATE_LIMIT_ANONYMOUS = 100;
export const RATE_LIMIT_SIGNED_IN = 600;

/**
 * builds the HTTP application (routes + middleware) without
 * - starting a server
 * - the collector
 * - the health sampler
 */
export function createApp() {
  const app = new Hono<AppEnv>();

  // designed error pages for every failure
  app.onError(onError);
  app.notFound(notFound);

  app.use("*", requestIdMiddleware);

  // liveness/readiness probes: before CSRF, rate limiting, access logging and auth
  app.route("/", probes);

  // static assets (css, js, images, favicon)
  for (const dir of STATIC_DIRS) {
    app.use(`/${dir}/*`, staticMiddleware);
  }

  // browsers that ignore the <link rel="icon"> still ask for /favicon.ico
  app.get("/favicon.ico", (c) => c.redirect(FAVICON, 301));

  app.use("*", csrfMiddleware);
  app.use(
    rateLimitMiddleware({
      windowMs: RATE_LIMIT_WINDOW_MS,
      // a session cookie only raises the ceiling; it is still verified by authMiddleware
      limit: (c) =>
        getCookie(c, "access_token") || getCookie(c, "refresh_token") ? RATE_LIMIT_SIGNED_IN : RATE_LIMIT_ANONYMOUS,
    })
  );
  app.use(loggerMiddleware);
  app.use(secureHeaders());

  // jsx renderer (pages only; /api returns JSON)
  app.use("*", async (c, next) => {
    if (c.req.path === "/api" || c.req.path.startsWith("/api/")) {
      return next();
    }
    return jsxMiddleware(c, next);
  });

  // public routes
  app.get("/", (c) => c.redirect("/app/databases"));
  app.route("/", auth);

  // everything below requires a session (docs §8.1)
  app.use(authMiddleware);
  app.route("/", pages);
  app.route("/api/databases", databasesApi);
  app.route("/api", snapshotsApi);
  app.route("/health", health);

  return app;
}
