# 6. API

## 6.1 Conventions

| Topic          | Rule                                                                                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication | Every endpoint except `GET /login`, `POST /auth/login`, `GET /` and static assets requires a session cookie ([§8.1](08-auth-security.md#81-authentication)).                                             |
| JSON vs pages  | Paths under `/api/*`, and any request whose `Accept` header includes `application/json` but not `text/html`, receive JSON. Everything else receives HTML.                                                |
| CSRF           | `POST` requests must send an `Origin` header equal to `APP_ORIGIN`; otherwise `403`. Browsers do this automatically.                                                                                     |
| Request ID     | Every response carries `X-Request-Id: req_<12 hex>`; errors repeat it in the body.                                                                                                                       |
| Rate limits    | Per client IP, per 15 minutes: 100 requests without a session cookie, 600 with one. `POST /auth/login` is additionally limited to 15 per 30 minutes. Exceeding a limit returns `429` with `Retry-After`. |
| Credentials    | Registered database passwords are never returned by any endpoint.                                                                                                                                        |

### Response envelope

JSON endpoints return:

```ts
interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}
```

### Error body

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Not found.",
  "requestId": "req_8b111cf8890b"
}
```

| Status | When                                                    | Extra fields                                                 |
| ------ | ------------------------------------------------------- | ------------------------------------------------------------ |
| `400`  | Invalid parameters or malformed body                    | —                                                            |
| `401`  | No valid session                                        | Body is `{ "error": "Unauthorized" }` from the session check |
| `403`  | Missing or foreign `Origin` header                      | `message` names the reason                                   |
| `404`  | Unknown path or database                                | —                                                            |
| `422`  | Validation failed or connection test failed on register | `fieldErrors` (validation) or `data` (connection result)     |
| `429`  | Rate limit exceeded                                     | `retryAfter` (seconds) and `Retry-After` header              |
| `500`  | Unexpected error                                        | —                                                            |
| `503`  | Metadata database unavailable                           | `retryAfter: 3` and `Retry-After` header                     |

## 6.2 Endpoint Summary

| Method | Path                       | Purpose                                            |
| ------ | -------------------------- | -------------------------------------------------- |
| `POST` | `/auth/login`              | Sign in and begin a session.                       |
| `POST` | `/auth/logout`             | End the current session.                           |
| `GET`  | `/api/databases`           | List registered databases with collection status.  |
| `POST` | `/api/databases/test`      | Test connectivity to a database without saving it. |
| `POST` | `/api/databases`           | Register a database.                               |
| `GET`  | `/api/views`               | List the system views available for display.       |
| `GET`  | `/api/snapshots`           | Retrieve recent snapshots for a database and view. |
| `GET`  | `/api/snapshots/latest`    | Retrieve the most recent snapshot for each view.   |
| `GET`  | `/health`                  | Platform health page, or JSON.                     |
| `POST` | `/health/scheduler/resume` | Resume a stopped collector scheduler.              |

## 6.3 Authentication

### `POST /auth/login`

Form-encoded (`application/x-www-form-urlencoded` or `multipart/form-data`).

| Field      | Type             | Rules                                                                        |
| ---------- | ---------------- | ---------------------------------------------------------------------------- |
| `email`    | string           | Valid email address.                                                         |
| `password` | string           | 1–256 characters.                                                            |
| `next`     | string, optional | Same-origin path to return to; anything else falls back to `/app/databases`. |

| Outcome                 | Response                                                                  |
| ----------------------- | ------------------------------------------------------------------------- |
| Success                 | `302` to `next`; sets `access_token` and `refresh_token` cookies.         |
| Invalid email format    | `400`, sign-in page with the message.                                     |
| Wrong email or password | `401`, sign-in page with "Invalid email or password." and the email kept. |
| Malformed body          | `400` error page.                                                         |
| Too many attempts       | `429` error page with countdown.                                          |

### `POST /auth/logout`

No body. Deletes the session behind the refresh cookie, clears both cookies,
`302` to `/login`.

## 6.4 Databases

### Database input schema

Used by `POST /api/databases/test` and `POST /api/databases` (JSON body).

| Field          | Type    | Rules                                                            |
| -------------- | ------- | ---------------------------------------------------------------- |
| `name`         | string  | 1–100 characters (trimmed).                                      |
| `host`         | string  | 1–255 characters; letters, digits, `.`, `-`, `_`, `:`, `[`, `]`. |
| `port`         | integer | 1–65535 (numeric strings are accepted).                          |
| `databaseName` | string  | 1–63 characters.                                                 |
| `username`     | string  | 1–63 characters.                                                 |
| `password`     | string  | 0–1024 characters.                                               |

Validation failure → `422`:

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Check the highlighted fields.",
  "fieldErrors": {
    "host": "Enter a hostname or IP address.",
    "port": "Port must be 1–65535."
  }
}
```

### `GET /api/databases`

```ts
type Response = ApiResponse<DatabaseSummary[]>; // ordered by name

interface DatabaseSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  createdAt: string; // ISO 8601
  state: "connected" | "unreachable" | "pending";
  checkedAt: string | null; // last collection attempt
  uptimeSeconds: number | null; // monitored server uptime
  viewsAvailable: number | null; // views collected in the last cycle
  lastCollectedAt: string | null; // newest snapshot
}
```

### `POST /api/databases/test`

Opens a read-only session and runs `SHOW server_version`. Always `200` unless
validation fails.

```json
{ "success": true,  "statusCode": 200, "message": "Connected", "data": { "ok": true, "serverVersion": "17.2" } }
{ "success": false, "statusCode": 200, "message": "Connection refused", "data": { "ok": false, "reason": "Connection refused" } }
```

Possible `reason` values: `Connection refused`, `Host not found`,
`Host unreachable`, `Connection timed out`, `Authentication failed`,
`Access denied for this user`, `Database does not exist`,
`Too many connections`, `Server is starting up or shutting down`,
`Insufficient privilege`, `SSL negotiation failed`, `Could not connect`.

### `POST /api/databases`

Re-tests the connection, then stores the database with the password encrypted.

| Outcome           | Status | Body                                                                                              |
| ----------------- | ------ | ------------------------------------------------------------------------------------------------- |
| Registered        | `201`  | `data`: the public fields (`id`, `name`, `host`, `port`, `databaseName`, `username`, `createdAt`) |
| Connection failed | `422`  | `data`: `{ ok: false, reason }`                                                                   |
| Invalid input     | `422`  | `fieldErrors`                                                                                     |
| Body is not JSON  | `400`  | —                                                                                                 |

## 6.5 Snapshots

### `GET /api/views`

| Query      | Required | Description                                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------------------------- |
| `database` | no       | Database UUID. When given, `available` is `true` only for views with at least one snapshot. |

```ts
type Response = ApiResponse<
  { name: string; description: string; available: boolean }[]
>;
```

### `GET /api/snapshots`

| Query      | Required | Description                       |
| ---------- | -------- | --------------------------------- |
| `database` | yes      | Database UUID.                    |
| `view`     | yes      | One of the configured view names. |
| `limit`    | no       | 1–20, default 5.                  |

Returns snapshots of one view, newest first.

### `GET /api/snapshots/latest`

| Query      | Required | Description                                                     |
| ---------- | -------- | --------------------------------------------------------------- |
| `database` | yes      | Database UUID.                                                  |
| `view`     | no       | Restrict to one view (used by the snapshots page when polling). |

Returns the latest snapshot per view, in configured view order. Reading never
triggers a collection.

```ts
interface SnapshotRecord {
  id: string;
  viewName: string;
  capturedAt: string; // ISO 8601
  rowCount: number;
  payload: Record<string, unknown>[]; // rows as collected, original column order
}
```

Errors: `400` for an invalid UUID or unknown view name, `404` for an unknown
database.

## 6.6 Health

### `GET /health`

| Query     | Description                                                          |
| --------- | -------------------------------------------------------------------- |
| `check=1` | Run all checks now instead of returning the latest 30-second sample. |

HTML by default. With `Accept: application/json` it returns the health payload —
`200` when healthy or degraded, `503` when critical:

```json
{
  "status": "healthy",
  "checkedAt": "2026-11-17T09:51:58.083Z",
  "services": {
    "metadata": {
      "status": "healthy",
      "label": "Connected",
      "connected": true,
      "latencyMs": 11,
      "pool": { "used": 1, "total": 2, "waiting": 0, "max": 10 },
      "checkedAt": "…"
    },
    "collector": {
      "status": "healthy",
      "label": "Running",
      "running": 1,
      "failing": 0,
      "lastTickAt": "…",
      "lastCompletedAt": "…",
      "errorsLastHour": 0,
      "averageTickMs": 14,
      "intervalSeconds": 60,
      "nextRunAt": "…",
      "stale": false,
      "lastError": null,
      "lastCycleFailed": false,
      "checkedAt": "…"
    },
    "scheduler": {
      "status": "healthy",
      "label": "Active",
      "active": true,
      "intervalSeconds": 60,
      "driftMs": 1,
      "nextRunAt": "…",
      "startedAt": "…",
      "checkedAt": "…"
    }
  },
  "app": {
    "version": "0.1.0",
    "node": "v22.12.0",
    "uptimeSeconds": 3725,
    "environment": "production"
  }
}
```

`status` is one of `healthy`, `degraded`, `critical`. Any key that looks secret
(`pass`, `secret`, `token`, `key`, `dsn`, `url`, `connection`, `credential`) is
replaced with `••••`.

### `POST /health/scheduler/resume`

Resumes a stopped scheduler; collection resumes on the next scheduled tick.

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Scheduler resumed",
  "data": { "resumed": true }
}
```

`resumed` is `false` (message "Scheduler is already active") when the scheduler
was running.

## 6.7 Page Routes

| Route                | Auth | Description                                                                                               |
| -------------------- | ---- | --------------------------------------------------------------------------------------------------------- |
| `GET /`              | —    | Redirects to `/app/databases`.                                                                            |
| `GET /login`         | —    | Sign-in page; redirects signed-in users to `next`.                                                        |
| `GET /app`           | ✓    | Redirects to `/app/databases`.                                                                            |
| `GET /app/databases` | ✓    | Registered databases. `?register=1` opens the register modal.                                             |
| `GET /app/snapshots` | ✓    | Snapshot viewer. `?database=<uuid>&view=<name>`; defaults to the first database and first available view. |
| `GET /health`        | ✓    | Platform health.                                                                                          |

---
