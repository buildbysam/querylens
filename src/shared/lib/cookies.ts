import { config } from "@/config.js";
import type { Context } from "hono";
import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";

const secret = config.getOrThrow("COOKIES_SECRET") as string;

const cookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "Lax" as const,
  path: "/",
};

export async function setAuthCookies(c: Context, accessToken: string, refreshToken: string) {
  await setSignedCookie(c, "access_token", accessToken, secret, {
    ...cookieOptions,
    maxAge: 15 * 60,
  });

  await setSignedCookie(c, "refresh_token", refreshToken, secret, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function getAccessCookie(c: Context) {
  return getSignedCookie(c, secret, "access_token");
}

export async function getRefreshCookie(c: Context) {
  return getSignedCookie(c, secret, "refresh_token");
}

export function clearAuthCookies(c: Context) {
  deleteCookie(c, "access_token", {
    path: "/",
  });

  deleteCookie(c, "refresh_token", {
    path: "/",
  });
}
