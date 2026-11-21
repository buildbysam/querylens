import { PUBLIC_DIR } from "@/shared/views/assets.js";
import { serveStatic } from "@hono/node-server/serve-static";
import { jsxRenderer } from "hono/jsx-renderer";

// renderer only adds the doctype
declare module "hono" {
  interface ContextRenderer {
    (content: string | Promise<string>, props?: Record<string, unknown>): Response | Promise<Response>;
  }
}

export const staticMiddleware = serveStatic({
  root: PUBLIC_DIR,
});

export const jsxMiddleware = jsxRenderer(({ children }) => <>{children}</>, { docType: true });
