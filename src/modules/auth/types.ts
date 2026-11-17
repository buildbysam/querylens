import { z } from "zod";

/**
 * Sign-in only checks shape; credentials are verified against the stored hash.
 * Account password rules live in scripts/create-admin.js.
 */
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password.").max(256),
  next: z.string().optional(),
});
