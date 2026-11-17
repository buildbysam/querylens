import { APP_NAME } from "@/shared/lib/app-info.js";
import { ClientScripts } from "@/shared/views/components/ClientScripts.js";
import type { Child } from "hono/jsx";

const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";

export interface DocumentProps {
  title?: string;
  bodyClass?: string;
  children?: Child;
}

/** <html>/<head> shared by AppLayout, AuthLayout and StandaloneLayout: fonts, CSS, Alpine. */
export function Document({ title, bodyClass, children }: DocumentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark" />
        <title>{title ? `${title} · ${APP_NAME}` : `${APP_NAME} · PostgreSQL Observability`}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link rel="stylesheet" href={FONTS_HREF} />
        <link rel="stylesheet" href="/css/styles.css" />
        <ClientScripts />
      </head>
      <body class={bodyClass}>{children}</body>
    </html>
  );
}
