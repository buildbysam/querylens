import { database } from "@/shared/db/client.js";
import { sessions } from "@/shared/db/schema.js";
import { getAccessCookie } from "@/shared/lib/cookies.js";
import { verifyAccessToken } from "@/shared/lib/jwt.js";
import type { AppEnv } from "@/types.js";
import { eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const token = await getAccessCookie(c);

  if (!token || typeof token !== "string") {
    // return c.redirect("/login");
    const returnTo = encodeURIComponent(c.req.path);
    return c.redirect(`/auth/refresh?returnTo=${returnTo}`);
  }

  try {
    const payload = await verifyAccessToken(token);

    const userId = payload.sub;
    const sessionId = payload.sessionId;

    if (typeof userId !== "string" || typeof sessionId !== "string") {
      return c.redirect("/login");
    }

    const [session] = await database.db.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1);
    if (!session || session.userId !== userId || session.expiresAt <= new Date()) {
      return c.redirect("/login");
    }

    c.set("userId", userId);

    await next();
  } catch {
    // return c.redirect("/login");
    const returnTo = encodeURIComponent(c.req.path);
    return c.redirect(`/auth/refresh?returnTo=${returnTo}`);
  }
});
