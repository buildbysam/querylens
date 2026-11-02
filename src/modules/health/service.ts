import { database } from "@/shared/db/client.js";

export interface HealthCheckResult {
  database: "connected" | "disconnected";
}

async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await database.db.execute("SELECT 1");
    // this.logger.log("Database connection is healthy.");
    return true;
  } catch (error) {
    // this.logger.error("Database connection failed:", error instanceof Error ? error : String(error));
    return false;
  }
}

export async function checkHealth(): Promise<HealthCheckResult> {
  const database = (await checkDatabaseConnection()) ? "connected" : "disconnected";
  return { database };
}
