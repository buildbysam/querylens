import { Document } from "@/shared/views/layouts/Document.js";
import type { Child } from "hono/jsx";

/** ull viewport, content centred on both axes, faint accent radial glow. no shell. */
export function AuthLayout({ title, children }: { title?: string; children?: Child }) {
  return (
    <Document title={title} bodyClass="min-h-screen">
      <main class="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12">
        <div
          class="from-accent-subtle pointer-events-none absolute top-1/2 left-1/2 -z-10 size-160 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial to-transparent to-70%"
          aria-hidden="true"
        />
        {children}
      </main>
    </Document>
  );
}
