import { config } from "@/config.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { jsxRenderer } from "hono/jsx-renderer";

// renderer only adds the doctype
declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props?: Record<string, unknown>): Response | Promise<Response>;
  }
}

export const staticMiddleware = serveStatic({
  root: config.isProduction ? "./dist/public" : "./public",
});

export const jsxMiddleware = jsxRenderer(({ children }) => <>{children}</>, { docType: true });
