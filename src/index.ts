import { serve } from "@hono/node-server";
import "dotenv/config";
import { Hono } from "hono";

const app = new Hono();
const port = Number(process.env.PORT) || 5000;

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
