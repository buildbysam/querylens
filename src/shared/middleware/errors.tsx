import { ErrorPage, type ErrorCode } from "@/modules/pages/ErrorPage.js";
import { safeNext } from "@/shared/lib/redirect.js";
import { wantsJson } from "@/shared/middleware/auth.js";
import { logger } from "@/shared/middleware/logger.js";
import { newRequestId } from "@/shared/middleware/request-id.js";
import type { Context, ErrorHandler, NotFoundHandler } from "hono";
import { html } from "hono/html";
import { HTTPException } from "hono/http-exception";

// every error the user can see goes through here: one of the seven

const JSON_MESSAGES: Record<ErrorCode, string> = {
  400: "The request was not valid.",
  401: "Sign-in is required.",
  403: "Access is not permitted.",
  404: "Not found.",
  429: "Too many requests.",
  500: "An unexpected error occurred.",
  503: "The service is temporarily unavailable.",
};

export interface ErrorOptions {
  /** JSON message override (API clients). The page always uses the designed copy. */
  message?: string;
  retryAfterSeconds?: number;
  details?: Record<string, string | number>;
}

/** Maps any status to one of the seven designed pages. */
function designedCode(status: number): ErrorCode {
  if (status === 400 || status === 401 || status === 403 || status === 404 || status === 429 || status === 503)
    return status;
  return status >= 500 ? 500 : 400;
}

/** 401 page: return to the page the user was on (Referer, same origin only), else the current GET path. */
function nextFor(c: Context): string {
  const current = new URL(c.req.url);
  if (c.req.method === "GET") return safeNext(current.pathname + current.search);
  const referer = c.req.header("Referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.origin === current.origin) return safeNext(url.pathname + url.search);
    } catch {
      // ignore malformed Referer
    }
  }
  return safeNext(undefined);
}

export function errorResponse(c: Context, status: number, options: ErrorOptions = {}) {
  const code = designedCode(status);
  const requestId: string = (c.get("requestId") as string | undefined) ?? newRequestId();

  if (options.retryAfterSeconds !== undefined) c.header("Retry-After", String(options.retryAfterSeconds));
  c.header("Cache-Control", "no-store");

  if (wantsJson(c)) {
    return c.json(
      {
        success: false,
        statusCode: code,
        message: options.message ?? JSON_MESSAGES[code],
        requestId,
        ...(options.retryAfterSeconds !== undefined ? { retryAfter: options.retryAfterSeconds } : {}),
      },
      code
    );
  }

  const page = (
    <ErrorPage
      code={code}
      requestId={requestId}
      time={new Date()}
      path={new URL(c.req.url).pathname}
      retryMode={c.req.method === "GET" || c.req.method === "HEAD" ? "reload" : "back"}
      next={code === 401 ? nextFor(c) : undefined}
      retryAfterSeconds={options.retryAfterSeconds}
      details={options.details}
    />
  );
  return c.html(html`<!DOCTYPE html>${page}`, code);
}

/** Connection-level failures of the metadata database → 503 rather than 500. */
const UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "ECONNRESET",
  "EHOSTUNREACH",
  "57P01",
  "57P02",
  "57P03",
  "53300",
  "08000",
  "08001",
  "08003",
  "08006",
]);

function unavailableReason(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    const e = current as { code?: string; message?: string; cause?: unknown };
    if (e.code && UNAVAILABLE_CODES.has(e.code)) return "Metadata database unavailable";
    if (
      typeof e.message === "string" &&
      /Connection terminated|timeout exceeded when trying to connect/i.test(e.message)
    ) {
      return "Metadata database unavailable";
    }
    current = e.cause;
  }
  return null;
}

export const onError: ErrorHandler = (err, c) => {
  const requestId = (c.get("requestId") as string | undefined) ?? "unknown";
  const where = `${c.req.method} ${new URL(c.req.url).pathname} [${requestId}]`;

  if (err instanceof HTTPException) {
    if (err.status >= 500) logger.error(`HTTP ${err.status} at ${where}`, err, "http");
    return errorResponse(c, err.status, { message: err.message || undefined });
  }

  const unavailable = unavailableReason(err);
  if (unavailable) {
    logger.error(`${unavailable} at ${where}`, err instanceof Error ? err : String(err), "http");
    return errorResponse(c, 503, { retryAfterSeconds: 3, details: { status: 503, reason: unavailable, requestId } });
  }

  logger.error(`Unhandled error at ${where}`, err instanceof Error ? err : String(err), "http");
  return errorResponse(c, 500, {
    details: { status: 500, error: err instanceof Error ? err.name : "Error", requestId },
  });
};

export const notFound: NotFoundHandler = (c) => errorResponse(c, 404);
