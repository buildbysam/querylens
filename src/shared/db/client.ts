import { config } from "@/config.js";
import { logger } from "@/shared/middleware/logger.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./relations.js";

class DatabaseClient {
  private readonly pool;
  readonly db;

  constructor() {
    const databaseUrl = config.getOrThrow("DATABASE_URL");
    this.pool = new Pool({ connectionString: databaseUrl });
    // An idle client losing its connection (DB restart, network blip) emits "error" on the pool.
    // Unhandled, that crashes the process; handled, the pool simply reconnects on the next query.
    this.pool.on("error", (error) => {
      logger.error(
        `Metadata database connection lost: ${(error as { code?: string }).code ?? error.message}`,
        undefined,
        "db"
      );
    });
    this.db = drizzle({
      client: this.pool,
      relations,
    });
  }

  /** Connection-pool usage for the platform health page. */
  poolStats() {
    return {
      used: this.pool.totalCount - this.pool.idleCount,
      total: this.pool.totalCount,
      waiting: this.pool.waitingCount,
      max: this.pool.options.max ?? 10,
    };
  }

  async close() {
    await this.pool.end();
  }
}

export const database = new DatabaseClient();
