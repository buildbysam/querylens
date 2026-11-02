import { config } from "@/config.js";
import { BaseLayout, type BaseLayoutProps } from "@/shared/views/layout.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { jsxRenderer } from "hono/jsx-renderer";

declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props: BaseLayoutProps): Response | Promise<Response>;
  }
}

export const staticMiddleware = serveStatic({
  root: config.isProduction ? "./dist/public" : "./public",
});

export const jsxMiddleware = jsxRenderer(({ children, title }) => {
  return <BaseLayout title={title}>{children}</BaseLayout>;
});
