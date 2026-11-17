import { createMiddleware } from "hono/factory";
import { randomBytes } from "node:crypto";

/**
 * gives every request a reference (`req_` + 12 hex chars) shown on error pages and in logs.
 * generated server-side only, client-supplied IDs are ignored.
 */
export function newRequestId() {
  return `req_${randomBytes(6).toString("hex")}`;
}

export const requestIdMiddleware = createMiddleware<{ Variables: { requestId: string } }>(async (c, next) => {
  const id = newRequestId();
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
});
