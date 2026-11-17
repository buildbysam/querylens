import { cx } from "@/shared/lib/cx.js";
import { alpineData, PAGE_SCRIPTS } from "@/shared/views/assets.js";
import { formatTimestamp } from "@/shared/lib/time.js";
import { Button } from "@/shared/views/components/Button.js";
import { CodeBlock } from "@/shared/views/components/CodeBlock.js";
import { Icon } from "@/shared/views/components/Icon.js";
import { StandaloneLayout, type GlowTone } from "@/shared/views/layouts/StandaloneLayout.js";

export type ErrorCode = 400 | 401 | 403 | 404 | 429 | 500 | 503;

/** How "retry"-style actions behave: reload is only safe for GET (never resubmit, §5.5). */
export type RetryMode = "reload" | "back";

interface ErrorContent {
  tone: GlowTone;
  label: string;
  title: string;
  description: string;
}

export const ERROR_CONTENT: Record<ErrorCode, ErrorContent> = {
  400: {
    tone: "accent",
    label: "Bad request",
    title: "That request didn't look right.",
    description:
      "Something in the request was missing or malformed. Go back and try again — if it keeps happening, share the request ID below.",
  },
  401: {
    tone: "accent",
    label: "Unauthorized",
    title: "You need to sign in to continue.",
    description: "Your session has ended or you haven't signed in yet. Sign in and you'll pick up where you left off.",
  },
  403: {
    tone: "accent",
    label: "Forbidden",
    title: "You don't have access to this.",
    description:
      "This action isn't permitted from here. If you submitted a form, reload the page it came from and try again.",
  },
  404: {
    tone: "accent",
    label: "Not found",
    title: "We couldn't find that page.",
    description: "The address may be mistyped, or the page may have moved. Check the URL or head back to a known page.",
  },
  429: {
    tone: "warning",
    label: "Too many requests",
    title: "Too many requests — slow down.",
    description: "You've reached the request limit for now. Wait until the timer runs out, then try again.",
  },
  500: {
    tone: "danger",
    label: "Internal server error",
    title: "Something broke on our side.",
    description:
      "An unexpected error stopped this request. Reload to try again, or report the issue with the request ID below.",
  },
  503: {
    tone: "danger",
    label: "Service unavailable",
    title: "The service is temporarily unavailable.",
    description:
      "QueryLens can't reach a service it depends on right now. It will retry automatically in a few seconds.",
  },
};

const codeColor: Record<GlowTone, string> = { accent: "text-accent", warning: "text-warning", danger: "text-danger" };

export interface ErrorPageProps {
  code: ErrorCode;
  requestId: string;
  time: Date;
  /** Request pathname (no query string). */
  path: string;
  retryMode: RetryMode;
  /** 401: validated path to return to after sign-in. */
  next?: string;
  /** 429 / 503: seconds until retry. */
  retryAfterSeconds?: number;
  /** 500 / 503: redacted details for the disclosure. Never stack traces, secrets or file paths. */
  details?: Record<string, string | number>;
}

function CopyRequestId({ requestId }: { requestId: string }) {
  return (
    <span x-data="copyable" class="inline-flex">
      <Button variant="ghost" icon="copy" x-on:click={`copy('${requestId}')`}>
        <span x-text="copied ? 'Copied' : 'Copy request ID'">Copy request ID</span>
      </Button>
    </span>
  );
}

function GoBack() {
  return (
    <Button variant="ghost" icon="arrow-left" x-on:click="back()">
      Go back
    </Button>
  );
}

function Actions({
  code,
  next,
  retryMode,
  requestId,
}: Pick<ErrorPageProps, "code" | "next" | "retryMode" | "requestId">) {
  const dashboard = (
    <Button variant="primary" href="/app/databases">
      Go to dashboard
    </Button>
  );
  const retryLabel = retryMode === "reload" ? "Reload page" : "Go back";

  switch (code) {
    case 400:
      return (
        <>
          <Button variant="primary" icon="arrow-left" x-on:click="back()">
            Go back
          </Button>
          <CopyRequestId requestId={requestId} />
        </>
      );
    case 401:
      return (
        <>
          <Button variant="primary" href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>
            Sign in
          </Button>
          <GoBack />
        </>
      );
    case 403:
    case 404:
      return (
        <>
          {dashboard}
          <GoBack />
        </>
      );
    case 429:
      return (
        <>
          <Button
            variant="primary"
            icon="refresh-cw"
            disabled
            x-bind:disabled="remaining > 0"
            x-bind:aria-disabled="(remaining > 0).toString()"
            x-on:click="retry()"
          >
            Try again
          </Button>
          <GoBack />
        </>
      );
    case 500:
      return (
        <>
          <Button variant="primary" icon="refresh-cw" x-on:click="retry()">
            {retryLabel}
          </Button>
          <CopyRequestId requestId={requestId} />
        </>
      );
    case 503:
      return (
        <>
          <Button variant="primary" icon="refresh-cw" x-on:click="retry()">
            Retry
            {retryMode === "reload" && (
              <span class="font-mono" x-show="remaining > 0" x-text="'(' + remaining + 's)'" />
            )}
          </Button>
          <Button variant="ghost" icon="heart-pulse" href="/health">
            Check status page
          </Button>
        </>
      );
  }
}

export function ErrorPage({
  code,
  requestId,
  time,
  path,
  retryMode,
  next,
  retryAfterSeconds,
  details,
}: ErrorPageProps) {
  const content = ERROR_CONTENT[code];
  const countdown = code === 429 ? (retryAfterSeconds ?? 60) : code === 503 ? (retryAfterSeconds ?? 3) : 0;
  const actions = { countdown, autoRetry: code === 503, mode: retryMode };

  return (
    <StandaloneLayout title={`${code} ${content.label}`} glowTone={content.tone} script={PAGE_SCRIPTS.error}>
      <div class="flex flex-col items-center text-center" x-data={alpineData("errorPage", actions)}>
        <p class={cx("text-hero tracking-hero font-mono font-bold", codeColor[content.tone])}>{code}</p>
        <p class="tracking-label text-fg-muted mt-2 text-xs font-semibold uppercase">{content.label}</p>
        <h1 class="tracking-heading text-fg mt-6 text-xl font-semibold">{content.title}</h1>
        <p class="text-fg-secondary mt-2 text-base">{content.description}</p>

        {code === 401 && next && (
          <p class="text-fg-muted mt-2 text-xs">
            You'll be returned to <span class="text-fg-secondary font-mono">{next}</span> after signing in.
          </p>
        )}

        {code === 429 && (
          <p
            role="timer"
            class="bg-warning/12 text-warning mt-6 inline-flex h-5.5 items-center gap-1 rounded-md px-2 text-xs font-medium"
            x-show="remaining > 0"
          >
            Retry available in{" "}
            <span class="font-mono" x-text="remaining">
              {countdown}
            </span>
            s
          </p>
        )}

        <div class="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Actions code={code} next={next} retryMode={retryMode} requestId={requestId} />
        </div>

        <div
          class="group border-line bg-subtle text-fg-muted mt-8 inline-flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs"
          x-data="copyable"
        >
          <span>
            Request ID <span class="text-fg-secondary font-mono">{requestId}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Time <span class="text-fg-secondary font-mono">{formatTimestamp(time)}</span>
          </span>
          <span aria-hidden="true">·</span>
          <span class="min-w-0 truncate">
            Path <span class="text-fg-secondary font-mono">{path}</span>
          </span>
          <button
            type="button"
            class="text-fg-muted ease-standard hover:text-fg flex size-6 items-center justify-center rounded-md opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Copy request ID"
            x-on:click={`copy('${requestId}')`}
          >
            <span x-show="!copied" class="inline-flex">
              <Icon name="copy" size={14} />
            </span>
            <span x-show="copied" x-cloak class="text-success inline-flex">
              <Icon name="check" size={14} />
            </span>
          </button>
        </div>

        {details && (code === 500 || code === 503) && (
          <details class="group mt-6 w-full text-left">
            <summary class="text-fg-secondary ease-standard hover:text-fg inline-flex cursor-pointer list-none items-center gap-1 rounded-md text-sm transition-colors duration-150">
              <Icon name="chevron-right" class="ease-standard transition-transform duration-150 group-open:rotate-90" />
              Details
            </summary>
            <CodeBlock size="xs" label="Error details" class="mt-2" code={JSON.stringify(details, null, 2)} />
          </details>
        )}
      </div>
    </StandaloneLayout>
  );
}
