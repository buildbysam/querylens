CREATE TABLE "databases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"host" varchar(255) NOT NULL,
	"port" integer DEFAULT 5432 NOT NULL,
	"database_name" varchar(63) NOT NULL,
	"username" varchar(63) NOT NULL,
	"protected_password" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"database_id" uuid NOT NULL,
	"view_name" varchar(63) NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" json NOT NULL,
	"row_count" integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX "snapshots_database_view_captured_idx" ON "snapshots" ("database_id","view_name","captured_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "snapshots" ADD CONSTRAINT "snapshots_database_id_databases_id_fkey" FOREIGN KEY ("database_id") REFERENCES "databases"("id") ON DELETE CASCADE;