import type { PageScript } from "@/shared/views/assets.js";
import { Document } from "@/shared/views/layouts/Document.js";
import type { Child } from "hono/jsx";

/** Full viewport on the app background, content centred on both axes. No shell, no decoration. */
export function AuthLayout({ title, script, children }: { title?: string; script?: PageScript; children?: Child }) {
  return (
    <Document title={title} bodyClass="min-h-screen" script={script}>
      <main class="flex min-h-screen flex-col items-center justify-center px-4 py-12">{children}</main>
    </Document>
  );
}
