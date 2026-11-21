import type { PageScript } from "@/shared/views/assets.js";
import { Sidebar, type NavKey, type SystemStatus } from "@/shared/views/components/Sidebar.js";
import { ToastRegion, type ToastMessage } from "@/shared/views/components/Toast.js";
import { TopBar, type CurrentUser } from "@/shared/views/components/TopBar.js";
import { Document } from "@/shared/views/layouts/Document.js";
import type { Child } from "hono/jsx";

export interface AppLayoutProps {
  /** Page title: shown in the top bar and the <title>. */
  title: string;
  active: NavKey;
  user: CurrentUser;
  systemStatus: SystemStatus;
  /** Database pill for /app/snapshots. */
  pill?: Child;
  /** Toasts to show on load (e.g. after a redirect). */
  toasts?: ToastMessage[];
  /** Page entry module from PAGE_SCRIPTS. */
  script?: PageScript;
  children?: Child;
}

/**
 * app shell (/app/* and /health)
 */
export function AppLayout({ title, active, user, systemStatus, pill, toasts, script, children }: AppLayoutProps) {
  return (
    <Document title={title} bodyClass="min-h-screen" script={script}>
      <div x-data="appShell" x-bind="root">
        <a
          href="#main"
          class="focus:bg-elevated focus:text-text-primary sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:rounded-lg focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <TopBar title={title} user={user} pill={pill} />
        <Sidebar active={active} systemStatus={systemStatus} />
        <main id="main" class="min-w-0 md:pl-16 lg:pl-60">
          <div class="mx-auto flex max-w-360 flex-col gap-6 px-4 py-8 md:px-8">{children}</div>
        </main>
        <ToastRegion initial={toasts} />
      </div>
    </Document>
  );
}
