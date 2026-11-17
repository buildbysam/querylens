import { z } from "zod";

// register/test-connection input. Identifiers follow PostgreSQL's 63-byte limit
export const databaseInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100, "Name must be at most 100 characters."),
  host: z
    .string()
    .trim()
    .min(1, "Host is required.")
    .max(255, "Host is too long.")
    .regex(/^[A-Za-z0-9.\-_:[\]]+$/, "Enter a hostname or IP address."),
  port: z.coerce
    .number()
    .int("Port must be a whole number.")
    .min(1, "Port must be 1–65535.")
    .max(65535, "Port must be 1–65535."),
  databaseName: z.string().trim().min(1, "Database is required.").max(63, "Database name is too long."),
  username: z.string().trim().min(1, "Username is required.").max(63, "Username is too long."),
  password: z.string().max(1024, "Password is too long."),
});

export type DatabaseInput = z.infer<typeof databaseInputSchema>;

export type ConnectionState = "connected" | "unreachable" | "pending";

// public shape of a registered database — never includes the password
export interface DatabaseSummary {
  id: string;
  name: string;
  host: string;
  port: number;
  databaseName: string;
  username: string;
  createdAt: Date;
  state: ConnectionState;
  checkedAt: Date | null;
  uptimeSeconds: number | null;
  viewsAvailable: number | null;
  lastCollectedAt: Date | null;
}

export type FieldErrors = Partial<Record<keyof DatabaseInput, string>>;

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0] as keyof DatabaseInput | undefined;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
