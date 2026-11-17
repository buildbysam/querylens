import { APP_SCRIPT, PRELOAD_MODULES, type PageScript } from "@/shared/views/assets.js";

/**
 * client-side behaviour as ES modules from public/js
 * module scripts run in document order before DOMContentLoaded, so the page entry registers its
 * components before app.js starts Alpine.
 */
export function ClientScripts({ page }: { page?: PageScript }) {
  return (
    <>
      {PRELOAD_MODULES.map((href) => (
        <link rel="modulepreload" href={href} />
      ))}
      <script type="module" src={APP_SCRIPT} />
      {page && <script type="module" src={page} />}
    </>
  );
}
