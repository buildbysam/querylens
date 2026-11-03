import { logger } from "@/shared/middleware/logger.js";
import { getConnInfo } from "@hono/node-server/conninfo";
import { rateLimiter } from "hono-rate-limiter";

interface Ratelimit {
  windowMs: number;
  limit: number;
}

export const rateLimitMiddleware = ({ windowMs, limit }: Ratelimit) =>
  rateLimiter({
    windowMs,
    limit,
    keyGenerator: (c) => getConnInfo(c).remote.address ?? "unknown",
    handler: async (c, next, options) => {
      const val = await options.keyGenerator(c);
      logger.error(`Rate limit exceeded for ${val}`);
      // render and send error page here
      return c.json(
        {
          error: "Too many requests",
          retryAfter: c.res.headers.get("Retry-After"),
        },
        429
      );
    },
  });
