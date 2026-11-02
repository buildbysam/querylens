import { config } from "@/config.js";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { relations } from "./relations.js";

class DatabaseClient {
  private readonly pool;
  readonly db;

  constructor() {
    const databaseUrl = config.getOrThrow("DATABASE_URL");
    this.pool = new Pool({ connectionString: databaseUrl });
    this.db = drizzle({
      client: this.pool,
      relations,
    });
  }

  async close() {
    await this.pool.end();
  }
}

export const database = new DatabaseClient();
