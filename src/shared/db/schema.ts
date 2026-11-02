import z from "zod";

export const postgresDatabaseSchema = z
  .string()
  .min(1, { message: "DATABASE_URL must not be empty" })
  .regex(/^postgres(ql)?:\/\/.+/, {
    message: "DATABASE_URL must be a PostgreSQL DSN (e.g. postgresql://user:pass@host:5432/db)",
  });
