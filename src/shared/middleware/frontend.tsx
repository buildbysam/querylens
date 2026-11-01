import { BaseLayout, type BaseLayoutProps } from "@/shared/views/layout.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { jsxRenderer } from "hono/jsx-renderer";

declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props: BaseLayoutProps): Response | Promise<Response>;
  }
}

const isProduction = process.env.NODE_ENV === "production";

export const staticMiddleware = serveStatic({
  root: isProduction ? "./dist/public" : "./public",
});

export const jsxMiddleware = jsxRenderer(({ children, title }) => {
  return <BaseLayout title={title}>{children}</BaseLayout>;
});
