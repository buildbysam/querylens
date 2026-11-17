import { index, integer, json, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date", precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  passwordHash: text("password_hash").notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** Registered PostgreSQL databases. The password is stored AES-256-GCM encrypted. */
export const databases = pgTable("databases", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  port: integer("port").notNull().default(5432),
  databaseName: varchar("database_name", { length: 63 }).notNull(),
  username: varchar("username", { length: 63 }).notNull(),
  protectedPassword: text("protected_password").notNull(),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
});

/** One collection of one system view at one time. Append-only. */
export const snapshots = pgTable(
  "snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    viewName: varchar("view_name", { length: 63 }).notNull(),
    capturedAt: timestamp("captured_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    // json (not jsonb) keeps the exact text, including column order, as collected
    payload: json("payload").notNull(),
    rowCount: integer("row_count").notNull(),
  },
  (table) => [
    index("snapshots_database_view_captured_idx").on(table.databaseId, table.viewName, table.capturedAt.desc()),
  ]
);
