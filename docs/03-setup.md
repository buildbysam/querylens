# 3. Setup

## 3.1 Requirements

| Requirement            | Version / notes                                            |
| ---------------------- | ---------------------------------------------------------- |
| Node.js                | 22 or later                                                |
| pnpm                   | 11 (`packageManager` is pinned in `package.json`)          |
| PostgreSQL (metadata)  | Any supported version; QueryLens creates four tables in it |
| PostgreSQL (monitored) | At least one instance to monitor                           |
| Docker + Compose       | Optional; recommended for deployment                       |
| `openssl`              | Used below to generate secrets                             |

## 3.2 Configuration

QueryLens is configured through environment variables, validated at start-up —
an invalid or missing value stops the process with a list of problems.

Variables are read from these files, first match wins per variable, and **real
environment variables override all files**:

1. `.env.<NODE_ENV>.local` (for example `.env.development.local`)
2. `.env.local`
3. `.env`

Start from the template: `cp .env.example .env.development.local`.

| Variable                      | Required | Default | Description                                                                                                                                                             |
| ----------------------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                    | yes      | —       | `development`, `production` or `test`. In production cookies are `Secure` and static files are served from `dist/public`.                                               |
| `APP_ORIGIN`                  | yes      | —       | Exact origin users browse to, e.g. `http://localhost:8000`. Unsafe requests whose `Origin` header differs are rejected (CSRF).                                          |
| `PORT`                        | yes      | —       | HTTP port, 1–65535.                                                                                                                                                     |
| `DATABASE_URL`                | yes      | —       | Metadata database, `postgres://user:pass@host:5432/db`.                                                                                                                 |
| `COOKIES_SECRET`              | yes      | —       | Signs session cookies.                                                                                                                                                  |
| `JWT_ACCESS_SECRET`           | yes      | —       | Signs 15-minute access tokens.                                                                                                                                          |
| `JWT_REFRESH_SECRET`          | yes      | —       | Signs 7-day refresh tokens.                                                                                                                                             |
| `ENCRYPTION_KEY`              | yes      | —       | Encrypts monitored-database passwords. **Never change it after registering databases** — stored passwords become undecryptable and collection fails for every database. |
| `COLLECTION_INTERVAL_SECONDS` | no       | `60`    | Collection interval, 10–3600.                                                                                                                                           |
| `LOG_LEVEL`                   | no       | —       | Validated (`error`…`verbose`) but currently not applied: the logger uses `info` in production and `debug` otherwise.                                                    |
| `LOG_FILE_PATH`               | no       | `logs`  | Directory for rotated log files. **Must be an absolute path when set.**                                                                                                 |

Secret rules: every secret must be at least 48 characters and must not contain
the placeholder words `change`, `replace`, `random-string`, `your-secret`,
`secret` or `password`. Generate each one with:

```bash
openssl rand -base64 48
```

### Docker Compose variables

`compose.yaml` builds `DATABASE_URL` itself and additionally reads:

| Variable            | Required | Default                 | Description                                                                                        |
| ------------------- | -------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | yes      | —                       | Password for the bundled metadata database. Keep it URL-safe (it is embedded in a connection URL). |
| `POSTGRES_USER`     | no       | `querylens`             | Metadata database user.                                                                            |
| `POSTGRES_DB`       | no       | `querylens`             | Metadata database name.                                                                            |
| `HOST_PORT`         | no       | `8000`                  | Host port mapped to the container's port 8000.                                                     |
| `APP_ORIGIN`        | no       | `http://localhost:8000` | Must match the URL you open in the browser.                                                        |

## 3.3 Quick Start — Docker Compose (recommended)

```bash
# 1. Configure
cp .env.example .env
#    edit .env: set POSTGRES_PASSWORD, COOKIES_SECRET, JWT_ACCESS_SECRET,
#    JWT_REFRESH_SECRET, ENCRYPTION_KEY and APP_ORIGIN=http://localhost:8000

# 2. Build and start: db → migrate (one-shot) → app
docker compose up --build -d

# 3. Create the administrator account (prompts for the password)
docker compose exec app node scripts/create-admin.js \
  --name "Ada Lovelace" --email ada@example.com

# 4. Open the app
open http://localhost:8000
```

Services started by `compose.yaml`:

| Service   | Purpose                                                                              |
| --------- | ------------------------------------------------------------------------------------ |
| `db`      | PostgreSQL 17 metadata database, volume `pgdata`, not published to the host.         |
| `migrate` | Applies `drizzle/` migrations once, then exits.                                      |
| `app`     | QueryLens on port 8000, logs in volume `logs`, starts only after `migrate` succeeds. |

## 3.4 Quick Start — Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure (see §3.2) — DATABASE_URL must point at a running PostgreSQL
cp .env.example .env.development.local

# 3. Apply migrations (drizzle-kit reads DATABASE_URL from the environment only)
pnpm exec dotenv run -f .env.development.local -- drizzle-kit migrate

# 4. Create the administrator account
pnpm create-admin --name "Ada Lovelace" --email ada@example.com

# 5. Run the server and the Tailwind watcher
pnpm dev
```

The app is then available on `http://localhost:<PORT>`. `pnpm dev` restarts the
server on source changes and rebuilds `public/css/styles.css` on template
changes.

## 3.5 First Run

1. Sign in at `/login` with the administrator account.
2. Open **Databases → Register Database**, fill in the connection, click **Test
   Connection**, then **Register**.
3. The first collection runs within one interval (immediately after start-up,
   then every `COLLECTION_INTERVAL_SECONDS`).
4. Open **Snapshots** to browse the collected views; open **Health** to confirm
   the collector and scheduler are running.

## 3.6 Monitored Database Access

Create a dedicated, least-privilege login on each monitored database:

```sql
CREATE ROLE querylens_monitor LOGIN PASSWORD '…';
GRANT pg_monitor TO querylens_monitor;          -- read all sessions and statistics
GRANT CONNECT ON DATABASE app_db TO querylens_monitor;
```

| Need                 | Notes                                                                                                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Network access       | The QueryLens host must reach the database host and port.                                                                                                                                                                       |
| Session visibility   | Without `pg_monitor` (or superuser), `pg_stat_activity` hides other users' queries.                                                                                                                                             |
| Statement statistics | `pg_stat_statements` is collected only if the extension is installed in the monitored database (`CREATE EXTENSION pg_stat_statements;` and `shared_preload_libraries`). Otherwise the view is omitted and collection continues. |
| TLS                  | Not configurable in this version; servers that require SSL report "SSL negotiation failed".                                                                                                                                     |

QueryLens never writes to a monitored database: sessions are opened read-only
and any write attempt is rejected by PostgreSQL.

---
