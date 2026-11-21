# 1. Overview

## 1.1 Purpose

QueryLens is a web-based performance monitoring platform for PostgreSQL. It
gives developers and database administrators one place to observe the
operational state of registered PostgreSQL databases without running diagnostic
queries by hand.

QueryLens collects statistics from PostgreSQL system views on a fixed interval,
stores each collection as an immutable record, and presents the stored data
through a server-rendered web interface. **All target-side operations are
read-only**: every monitoring session is opened with
`default_transaction_read_only=on`.

## 1.2 Scope

### In scope

| Area                  | What ships                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Database registration | Register PostgreSQL databases, test connectivity before saving, store credentials encrypted. |
| Scheduled collection  | Read five system views from every registered database on a fixed interval.                   |
| Raw storage           | Persist each view's rows exactly as collected (one snapshot per view per cycle).             |
| Statistics viewing    | Browse the latest snapshot of any view as a table whose columns are derived from the data.   |
| Platform health       | A page reporting QueryLens's own metadata database, collector and scheduler.                 |
| Error handling        | Seven designed error pages (400, 401, 403, 404, 429, 500, 503) and matching JSON errors.     |

The complete set of user-facing pages is:

| Route            | Page                                              |
| ---------------- | ------------------------------------------------- |
| `/login`         | Sign in                                           |
| `/app/databases` | Registered databases                              |
| `/app/snapshots` | Collected statistics viewer                       |
| `/health`        | Internal platform health                          |
| —                | Error pages for 400, 401, 403, 404, 429, 500, 503 |

### Out of scope

The following are deliberately **not** part of QueryLens and must not be built,
stubbed or scaffolded: dashboards, charts, dedicated activity / queries / tables
/ indexes / locks / alerts / settings pages, execution-plan viewer, SQL
playground, schema explorer, replication monitoring, CSV export, audit log,
WebSockets, Server-Sent Events, Redis, BullMQ, role-based access control,
multi-user sign-up, and a notifications UI.

QueryLens complements PostgreSQL administration practices. It is not a
replacement for PostgreSQL or for database administration tools, and it never
modifies a monitored database.

## 1.3 Core Capabilities

| Capability            | Description                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| Database registration | Add PostgreSQL databases and verify connectivity; the connection is re-tested server-side on save. |
| Scheduled collection  | Retrieve statistics from PostgreSQL system views every `COLLECTION_INTERVAL_SECONDS` (default 60). |
| Raw storage           | Store each collection unchanged as a JSON document, including the view's column order.             |
| Statistics viewing    | Display collected statistics in a table that polls for the latest snapshot every 30 seconds.       |
| Platform health       | Report the state of QueryLens services with 40-sample history and an internal event log.           |
| Error handling        | Present designed error pages with a request reference for every failure.                           |

## 1.4 Intended Users

QueryLens is intended for developers and database administrators who need a
centralised, read-only view of PostgreSQL database activity. Accounts are
created by an operator with a command-line script; there is no self-service
sign-up.

## 1.5 Technology

| Layer            | Technology                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Runtime          | Node.js ≥ 22, TypeScript (`tsx` in development, compiled to `dist/` for production)      |
| HTTP framework   | Hono 4 with `@hono/node-server`                                                          |
| Views            | Hono JSX (server-rendered), Tailwind CSS v4, Alpine.js 3 (CDN) for limited interactivity |
| Metadata storage | PostgreSQL via Drizzle ORM and `pg`                                                      |
| Validation       | Zod                                                                                      |
| Authentication   | JWT (`jose`) in signed HTTP-only cookies, bcrypt password hashes                         |
| Logging          | Winston with daily-rotated files                                                         |
| Packaging        | pnpm 11, Docker, Docker Compose                                                          |

---
