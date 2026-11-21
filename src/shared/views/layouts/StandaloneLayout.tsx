import type { PageScript } from "@/shared/views/assets.js";
import { Logo } from "@/shared/views/components/Logo.js";
import { Document } from "@/shared/views/layouts/Document.js";
import type { Child } from "hono/jsx";

export interface StandaloneLayoutProps {
  title?: string;
  /** Page entry module from PAGE_SCRIPTS. */
  script?: PageScript;
  children?: Child;
}

/**
 * Error pages: full viewport on the app background, centred column max 520px,
 * no sidebar / nav / footer. The logo top-left links back to /app/databases.
 */
export function StandaloneLayout({ title, script, children }: StandaloneLayoutProps) {
  return (
    <Document title={title} bodyClass="min-h-screen" script={script}>
      <div class="flex min-h-screen flex-col">
        <div class="px-6 pt-6">
          <Logo size="sm" href="/app/databases" />
        </div>
        <main class="flex flex-1 items-center justify-center px-4 py-12">
          <div class="w-full max-w-130">{children}</div>
        </main>
      </div>
    </Document>
  );
}
