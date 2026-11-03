import { config } from "@/config.js";
import { createMiddleware } from "hono/factory";

const trustedOrigin = new URL(config.getOrThrow("APP_ORIGIN") as string).origin;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const csrfMiddleware = createMiddleware(async (c, next) => {
  const method = c.req.method.toUpperCase();

  // allow read-only requests
  if (SAFE_METHODS.has(method)) {
    return next();
  }

  // validate origin
  const origin = c.req.header("Origin");
  if (!origin) {
    return c.json({ error: "Missing Origin header" }, 403);
  }

  try {
    if (new URL(origin).origin !== trustedOrigin) {
      return c.json({ error: "Invalid request origin" }, 403);
    }
  } catch {
    return c.json({ error: "Invalid request origin" }, 403);
  }

  // browser-level protection
  const fetchSite = c.req.header("Sec-Fetch-Site");

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return c.json({ error: "Cross-site request blocked" }, 403);
  }

  await next();
});
