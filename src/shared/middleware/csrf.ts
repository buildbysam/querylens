import { config } from "@/config.js";
import { errorResponse } from "@/shared/middleware/errors.js";
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
    return errorResponse(c, 403, { message: "Missing Origin header" });
  }

  try {
    if (new URL(origin).origin !== trustedOrigin) {
      return errorResponse(c, 403, { message: "Invalid request origin" });
    }
  } catch {
    return errorResponse(c, 403, { message: "Invalid request origin" });
  }

  // browser-level protection
  const fetchSite = c.req.header("Sec-Fetch-Site");

  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return errorResponse(c, 403, { message: "Cross-site request blocked" });
  }

  await next();
});
