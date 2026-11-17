import { errorResponse } from "@/shared/middleware/errors.js";
import { logger } from "@/shared/middleware/logger.js";
import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { rateLimiter } from "hono-rate-limiter";

interface Ratelimit {
  windowMs: number;
  /** Fixed ceiling, or computed per request. */
  limit: number | ((c: Context) => number);
}

export const rateLimitMiddleware = ({ windowMs, limit }: Ratelimit) =>
  rateLimiter({
    windowMs,
    limit,
    keyGenerator: (c) => getConnInfo(c).remote.address ?? "unknown",
    handler: async (c, _next, options) => {
      const key = await options.keyGenerator(c);
      logger.warn(`Rate limit exceeded for ${key} on ${c.req.method} ${c.req.path}`, "rate-limit");
      // hono-rate-limiter stores its info under the "rateLimit" context key (untyped)
      const info = (c as unknown as { get(key: string): unknown }).get("rateLimit") as { resetTime?: Date } | undefined;
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil(((info?.resetTime?.getTime() ?? Date.now() + windowMs) - Date.now()) / 1000)
      );
      // designed 429 page for browsers, JSON for API clients (DESIGN.md §5.5)
      return errorResponse(c, 429, { retryAfterSeconds });
    },
  });
