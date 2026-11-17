import { loginUrl, safeNext } from "@/shared/lib/redirect.js";
import { getSessionUser } from "@/shared/lib/session.js";
import type { AppEnv } from "@/types.js";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

/** Data requests get JSON errors; page requests get redirects / error pages. */
export function wantsJson(c: Context) {
  if (c.req.path === "/api" || c.req.path.startsWith("/api/")) return true;
  const accept = c.req.header("Accept") ?? "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

/**
 * requires a session. expired access tokens are refreshed silently.
 * without a session:
 *   - /api/* and JSON requests → 401 JSON
 *   - GET/HEAD page requests  → redirect to /login?next=<path>
 *   - other page requests     → 401 (rendered as the 401 error page)
 */
export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const user = await getSessionUser(c);

  if (user) {
    c.set("user", user);
    c.set("userId", user.id);
    return next();
  }

  if (wantsJson(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (c.req.method === "GET" || c.req.method === "HEAD") {
    const url = new URL(c.req.url);
    return c.redirect(loginUrl(safeNext(url.pathname + url.search)));
  }

  throw new HTTPException(401, { message: "Sign-in is required." });
});
