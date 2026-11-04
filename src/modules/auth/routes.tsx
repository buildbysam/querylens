import { loginSchema, registerSchema } from "@/modules/auth/types.js";
import { LoginPage, RegisterPage } from "@/modules/auth/views.js";
import { database } from "@/shared/db/client.js";
import { sessions, users } from "@/shared/db/schema.js";
import { hashToken } from "@/shared/lib/auth.js";
import { clearAuthCookies, setAuthCookies } from "@/shared/lib/cookies.js";
import { createAccessToken, createRefreshToken, verifyRefreshToken } from "@/shared/lib/jwt.js";
import { hashPassword, verifyPassword } from "@/shared/lib/password.js";
import { rateLimitMiddleware } from "@/shared/middleware/rate-limit.js";
import { randomUUID } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";

export const auth = new Hono();

export async function checkExistingUser(email: string) {
  return (await database.db.select().from(users).where(eq(users.email, email)).limit(1))[0];
}

auth.get("/login", async (c) => {
  return c.render(<LoginPage />, { title: "Login" });
});

auth.get("/register", async (c) => {
  return c.render(<RegisterPage />, { title: "Register" });
});

auth.use(
  rateLimitMiddleware({
    windowMs: 30 * 60 * 1000,
    limit: 15,
  })
);

auth.post("/auth/register", async (c) => {
  const body = await c.req.parseBody();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return c.text("Invalid registration details", 400);
  }
  const { name, email, password } = parsed.data;
  const existingUser = await checkExistingUser(email);
  if (existingUser) {
    return c.text("Email already registered", 409);
  }
  const passwordHash = await hashPassword(password);
  await database.db.insert(users).values({ name, email, passwordHash });
  return c.redirect("/login");
});

auth.post("/auth/login", async (c) => {
  const body = await c.req.parseBody();
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return c.text("Invalid email or password", 400);
  }

  const { email, password } = parsed.data;

  const user = await checkExistingUser(email);
  if (!user) {
    return c.text("Invalid email or password", 401);
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return c.text("Invalid email or password", 401);
  }

  const sessionId = randomUUID();
  const accessToken = await createAccessToken(user.id, sessionId);
  const refreshToken = await createRefreshToken(user.id, sessionId);

  await database.db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    refreshTokenHash: await hashToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  setAuthCookies(c, accessToken, refreshToken);

  return c.redirect("/dashboard");
});

auth.post("/auth/logout", async (c) => {
  const token = getCookie(c, "refresh_token");

  if (token) {
    try {
      const payload = await verifyRefreshToken(token);
      if (typeof payload.sessionId === "string") {
        await database.db.delete(sessions).where(eq(sessions.id, payload.sessionId));
      }
    } catch {
      // Invalid or expired token: still clear cookies.
    }
  }
  clearAuthCookies(c);
  return c.redirect("/login");
});

auth.get("/auth/refresh", async (c) => {
  const returnTo = c.req.query("returnTo") || "/dashboard";

  // prevent open redirects
  const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";

  const oldToken = getCookie(c, "refresh_token");

  if (!oldToken) {
    clearAuthCookies(c);
    return c.redirect("/login");
  }

  try {
    const payload = await verifyRefreshToken(oldToken);

    const userId = payload.sub;
    const sessionId = payload.sessionId;

    if (typeof userId !== "string" || typeof sessionId !== "string") {
      throw new Error("Invalid refresh token");
    }

    const oldHash = await hashToken(oldToken);
    const newRefreshToken = await createRefreshToken(userId, sessionId);
    const newHash = await hashToken(newRefreshToken);

    const updated = await database.db
      .update(sessions)
      .set({
        refreshTokenHash: newHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.userId, userId),
          eq(sessions.refreshTokenHash, oldHash),
          gt(sessions.expiresAt, new Date())
        )
      )
      .returning({ id: sessions.id });

    if (!updated.length) {
      throw new Error("Session expired or token reused");
    }

    const accessToken = await createAccessToken(userId, sessionId);

    setAuthCookies(c, accessToken, newRefreshToken);

    return c.redirect(safeReturnTo);
  } catch {
    clearAuthCookies(c);
    return c.redirect("/login");
  }
});

// protected pages
// app.get("/dashboard", authMiddleware, (c) => {
//   const userId = c.get("userId");

//   return c.render(
//     <DashboardPage userId={userId} />
//   );
// });
