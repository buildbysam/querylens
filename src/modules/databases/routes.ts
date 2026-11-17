import type { IApiResponse } from "@/config.js";
import { listDatabases, registerDatabase, testConnection } from "@/modules/databases/service.js";
import { databaseInputSchema, fieldErrorsFrom, type FieldErrors } from "@/modules/databases/types.js";
import type { AppEnv } from "@/types.js";
import { Hono, type Context } from "hono";

// mounted at /api/databases
// requires a session (authMiddleware runs before it)
export const databasesApi = new Hono<AppEnv>();

type ValidationBody = IApiResponse<never> & { fieldErrors: FieldErrors };

async function readInput(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return {
      error: c.json<IApiResponse<never>>(
        { success: false, statusCode: 400, message: "Request body must be JSON." },
        400
      ),
    };
  }
  const parsed = databaseInputSchema.safeParse(body);
  if (!parsed.success) {
    return {
      error: c.json<ValidationBody>(
        {
          success: false,
          statusCode: 422,
          message: "Check the highlighted fields.",
          fieldErrors: fieldErrorsFrom(parsed.error),
        },
        422
      ),
    };
  }
  return { input: parsed.data };
}

/** GET /api/databases — registered databases with collection status. Passwords are never returned. */
databasesApi.get("/", async (c) => {
  const data = await listDatabases();
  return c.json<IApiResponse<typeof data>>({ success: true, statusCode: 200, message: "OK", data });
});

/** POST /api/databases/test — connectivity check for the register modal (decision 3). */
databasesApi.post("/test", async (c) => {
  const { input, error } = await readInput(c);
  if (error) return error;
  const result = await testConnection(input);
  return c.json<IApiResponse<typeof result>>({
    success: result.ok,
    statusCode: 200,
    message: result.ok ? "Connected" : (result.reason ?? "Could not connect"),
    data: result,
  });
});

/** POST /api/databases — registers a database. The connection is re-tested server-side first. */
databasesApi.post("/", async (c) => {
  const { input, error } = await readInput(c);
  if (error) return error;

  const result = await testConnection(input);
  if (!result.ok) {
    return c.json<IApiResponse<typeof result>>(
      { success: false, statusCode: 422, message: result.reason ?? "Could not connect", data: result },
      422
    );
  }

  const data = await registerDatabase(input);
  return c.json<IApiResponse<typeof data>>(
    { success: true, statusCode: 201, message: "Database registered", data },
    201
  );
});
