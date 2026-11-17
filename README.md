# QueryLens

QueryLens is a PostgreSQL performance monitoring platform. It registers
PostgreSQL databases, collects operational statistics from PostgreSQL system
views on a schedule, stores them without modification, and displays them through
a server-rendered web interface.

## Quick start

```bash
cp .env.example .env          # set POSTGRES_PASSWORD, the four secrets and APP_ORIGIN
docker compose up --build -d
docker compose exec app node scripts/create-admin.js --name "Ada Lovelace" --email ada@example.com
```

Then open `http://localhost:8000`. For local development without Docker, see
[`docs/03-setup.md`](docs/03-setup.md#34-quick-start--local-development).

```bash
pnpm dev         # server + Tailwind watcher
pnpm typecheck   # TypeScript
pnpm test        # unit tests; add TEST_DATABASE_URL=… for the HTTP integration suite
```

## Documentation

Start with `01-overview.md` for what QueryLens is, then `03-setup.md` to run it.

| File                                                   | Description                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [`docs/01-overview.md`](docs/01-overview.md)           | Purpose, scope, capabilities and technology                            |
| [`docs/02-architecture.md`](docs/02-architecture.md)   | System structure, request pipeline, collection cycle and module layout |
| [`docs/03-setup.md`](docs/03-setup.md)                 | Requirements, configuration reference and quick start                  |
| [`docs/04-data-model.md`](docs/04-data-model.md)       | Metadata schema, storage approach and migrations                       |
| [`docs/05-collector.md`](docs/05-collector.md)         | How statistics are collected on a schedule                             |
| [`docs/06-api.md`](docs/06-api.md)                     | Endpoint reference with request and response schemas                   |
| [`docs/07-web.md`](docs/07-web.md)                     | Pages, layouts and client-side behaviour                               |
| [`docs/08-auth-security.md`](docs/08-auth-security.md) | Authentication, credential protection and security practices           |
| [`docs/09-health-errors.md`](docs/09-health-errors.md) | Platform health page and error pages                                   |
| [`docs/10-dev-guide.md`](docs/10-dev-guide.md)         | Project structure, testing, migrations, deployment and limitations     |
