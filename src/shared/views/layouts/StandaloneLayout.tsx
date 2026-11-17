import type { PageScript } from "@/shared/views/assets.js";
import { Logo } from "@/shared/views/components/Logo.js";
import { Document } from "@/shared/views/layouts/Document.js";
import type { Child } from "hono/jsx";

export type GlowTone = "accent" | "warning" | "danger";

/** Status colour at 6% opacity behind the content (§5.5). */
const glow: Record<GlowTone, string> = {
  accent: "from-accent/6",
  warning: "from-warning/6",
  danger: "from-danger/6",
};

export interface StandaloneLayoutProps {
  title?: string;
  glowTone?: GlowTone;
  /** Page entry module from PAGE_SCRIPTS. */
  script?: PageScript;
  children?: Child;
}

/**
 * error pages: full viewport, centred column max 520px, no sidebar / nav / footer.
 * Wordmark top-left links back to /app/databases.
 */
export function StandaloneLayout({ title, glowTone = "accent", script, children }: StandaloneLayoutProps) {
  return (
    <Document title={title} bodyClass="min-h-screen" script={script}>
      <div class="relative isolate flex min-h-screen flex-col overflow-hidden">
        <div class="px-6 pt-6">
          <Logo size="sm" href="/app/databases" />
        </div>
        <main class="flex flex-1 items-center justify-center px-4 py-12">
          <div
            class={`pointer-events-none absolute top-1/2 left-1/2 -z-10 size-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial ${glow[glowTone]} to-transparent to-70%`}
            aria-hidden="true"
          />
          <div class="w-full max-w-130">{children}</div>
        </main>
      </div>
    </Document>
  );
}
