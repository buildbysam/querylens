import { loginSchema } from "@/modules/auth/types.js";
import { LoginPage } from "@/modules/pages/LoginPage.js";
import { database } from "@/shared/db/client.js";
import { users } from "@/shared/db/schema.js";
import { clearAuthCookies } from "@/shared/lib/cookies.js";
import { hashPassword, verifyPassword } from "@/shared/lib/password.js";
import { safeNext } from "@/shared/lib/redirect.js";
import { endSession, getSessionUser, startSession } from "@/shared/lib/session.js";
import { rateLimitMiddleware } from "@/shared/middleware/rate-limit.js";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

export const auth = new Hono();

const INVALID_CREDENTIALS = "Invalid email or password.";

/** sign-in rate limiting, applied to the sign-in POST only. */
const loginRateLimit = rateLimitMiddleware({
  windowMs: 30 * 60 * 1000,
  limit: 15,
});

async function findUserByEmail(email: string) {
  return (await database.db.select().from(users).where(eq(users.email, email)).limit(1))[0];
}

/** burns same bcrypt cost for unknown emails so response time doesn't reveal which accounts exist. */
let dummyHash: Promise<string> | undefined;
async function burnPasswordCheck(password: string) {
  dummyHash ??= hashPassword(crypto.randomUUID());
  await verifyPassword(password, await dummyHash);
}

auth.get("/login", async (c) => {
  const next = safeNext(c.req.query("next"));
  if (await getSessionUser(c)) {
    return c.redirect(next);
  }
  return c.render(<LoginPage next={next} />);
});

auth.post("/auth/login", loginRateLimit, async (c) => {
  const body = await c.req.parseBody().catch(() => {
    throw new HTTPException(400, { message: "Malformed form body." });
  });
  const next = safeNext(body.next);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    const email = typeof body.email === "string" ? body.email : undefined;
    c.status(400);
    return c.render(
      <LoginPage next={next} email={email} error={parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS} />
    );
  }

  const { email, password } = parsed.data;
  const user = await findUserByEmail(email);
  const valid = user ? await verifyPassword(password, user.passwordHash) : (await burnPasswordCheck(password), false);

  if (!user || !valid) {
    c.status(401);
    return c.render(<LoginPage next={next} email={email} error={INVALID_CREDENTIALS} />);
  }

  await startSession(c, user.id);
  return c.redirect(next);
});

auth.post("/auth/logout", async (c) => {
  await endSession(c);
  clearAuthCookies(c);
  return c.redirect("/login");
});
