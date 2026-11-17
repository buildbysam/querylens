import { database } from "@/shared/db/client.js";
import { sessions, users } from "@/shared/db/schema.js";
import { hashToken } from "@/shared/lib/auth.js";
import { getAccessCookie, getRefreshCookie, setAuthCookies } from "@/shared/lib/cookies.js";
import { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } from "@/shared/lib/jwt.js";
import { and, eq, gt } from "drizzle-orm";
import type { Context } from "hono";

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  sessionId: string;
}

async function loadUser(userId: string, sessionId: string): Promise<SessionUser | null> {
  const [row] = await database.db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return row ? { ...row, sessionId } : null;
}

/** Verifies a JWT; any verification failure means "no session". */
async function claimsOf(verify: Promise<{ sub?: unknown; sessionId?: unknown }>) {
  try {
    const payload = await verify;
    return typeof payload.sub === "string" && typeof payload.sessionId === "string"
      ? { userId: payload.sub, sessionId: payload.sessionId }
      : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the user from a valid access token whose session still exists.
 * Token problems return null; database errors propagate (→ 503, not a sign-in redirect).
 */
async function fromAccessToken(c: Context): Promise<SessionUser | null> {
  const token = await getAccessCookie(c);
  if (!token) return null;
  const claims = await claimsOf(verifyAccessToken(token));
  return claims ? loadUser(claims.userId, claims.sessionId) : null;
}

/**
 * Rotates the refresh token (one-time use) and issues a new access token.
 * Returns null when the refresh token is missing, invalid, expired or already used.
 */
export async function refreshSession(c: Context): Promise<SessionUser | null> {
  const oldToken = await getRefreshCookie(c);
  if (!oldToken) return null;
  const claims = await claimsOf(verifyRefreshToken(oldToken));
  if (!claims) return null;
  const { userId, sessionId } = claims;

  const newRefreshToken = await createRefreshToken(userId, sessionId);
  const updated = await database.db
    .update(sessions)
    .set({ refreshTokenHash: await hashToken(newRefreshToken), expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        eq(sessions.refreshTokenHash, await hashToken(oldToken)),
        gt(sessions.expiresAt, new Date())
      )
    )
    .returning({ id: sessions.id });
  if (!updated.length) return null;

  await setAuthCookies(c, await createAccessToken(userId, sessionId), newRefreshToken);
  return await loadUser(userId, sessionId);
}

/** Current user: valid access token, otherwise a silent refresh-token rotation. */
export async function getSessionUser(c: Context): Promise<SessionUser | null> {
  return (await fromAccessToken(c)) ?? (await refreshSession(c));
}

/** Starts a session for a verified user and sets both auth cookies. */
export async function startSession(c: Context, userId: string) {
  const sessionId = crypto.randomUUID();
  const refreshToken = await createRefreshToken(userId, sessionId);
  await database.db.insert(sessions).values({
    id: sessionId,
    userId,
    refreshTokenHash: await hashToken(refreshToken),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  await setAuthCookies(c, await createAccessToken(userId, sessionId), refreshToken);
}

/** Deletes the session behind the refresh cookie, if any. Cookies are cleared by the caller. */
export async function endSession(c: Context) {
  const token = await getRefreshCookie(c);
  if (!token) return;
  try {
    const payload = await verifyRefreshToken(token);
    if (typeof payload.sessionId === "string") {
      await database.db.delete(sessions).where(eq(sessions.id, payload.sessionId));
    }
  } catch {
    // invalid or expired token: nothing to delete
  }
}
