import { APP_NAME } from "@/shared/lib/app-info.js";
import { FAVICON, FONTS_STYLESHEET, STYLESHEET, type PageScript } from "@/shared/views/assets.js";
import { ClientScripts } from "@/shared/views/components/ClientScripts.js";
import type { Child } from "hono/jsx";

export interface DocumentProps {
  title?: string;
  bodyClass?: string;
  /** Page entry module from PAGE_SCRIPTS, loaded after the shared app script. */
  script?: PageScript;
  children?: Child;
}

/** <html>/<head> shared by AppLayout, AuthLayout and StandaloneLayout: fonts, CSS, Alpine. */
export function Document({ title, bodyClass, script, children }: DocumentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="dark" />
        <title>{title ? `${title} · ${APP_NAME}` : `${APP_NAME} · PostgreSQL Observability`}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link rel="stylesheet" href={FONTS_STYLESHEET} />
        <link rel="icon" type="image/png" href={FAVICON} />
        <link rel="apple-touch-icon" href={FAVICON} />
        <link rel="stylesheet" href={STYLESHEET} />
        <ClientScripts page={script} />
      </head>
      <body class={bodyClass}>{children}</body>
    </html>
  );
}
