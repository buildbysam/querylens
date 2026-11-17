/**
 * Creates a QueryLens user account
 *   node scripts/create-admin.js --name "John Doe" --email ada@example.com
 *   docker compose exec app node scripts/create-admin.js --name "…" --email …
 *
 * The password is prompted for without echo, or read from ADMIN_PASSWORD for automation.
 */
import bcrypt from "bcrypt";
import * as dotenv from "dotenv";
import fs from "node:fs";
import { parseArgs } from "node:util";
import pg from "pg";
import { z } from "zod";

// keep in sync with `src/shared/lib/password.ts`
const BCRYPT_ROUNDS = 15;

const passwordSchema = z
  .string()
  .min(8, "Password must be between 8 and 20 characters.")
  .max(20, "Password must be between 8 and 20 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character.");

const inputSchema = z.object({
  name: z.string({ message: "--name is required." }).trim().min(1, "Name is required.").max(100),
  email: z.string({ message: "--email is required." }).trim().pipe(z.email("Enter a valid email address.")),
  password: passwordSchema,
});

/** Same lookup order as src/config.ts; real environment variables win over files. */
function loadDatabaseUrl() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const fromFiles = {};
  for (const path of [`.env.${nodeEnv}.local`, ".env.local", ".env"]) {
    if (!fs.existsSync(path)) continue;
    // earlier files take precedence over later ones
    for (const [key, value] of Object.entries(dotenv.parse(fs.readFileSync(path)))) {
      if (!(key in fromFiles)) fromFiles[key] = value;
    }
  }
  const url = process.env.DATABASE_URL ?? fromFiles.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (environment or .env files).");
  return url;
}

/** Reads a line from the terminal without echoing it. */
function promptHidden(question) {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    return Promise.reject(new Error("No terminal for the password prompt; set ADMIN_PASSWORD instead."));
  }
  return new Promise((resolve, reject) => {
    let value = "";
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          cleanup();
          stdout.write("\n");
          return resolve(value);
        }
        if (ch === String.fromCharCode(3)) {
          cleanup();
          stdout.write("\n");
          return reject(new Error("Cancelled."));
        }
        if (ch === String.fromCharCode(127) || ch === "\b") value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const { values } = parseArgs({ options: { name: { type: "string" }, email: { type: "string" } } });

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await promptHidden("Password: ");
    if (password !== (await promptHidden("Confirm password: "))) throw new Error("Passwords do not match.");
  }

  const parsed = inputSchema.safeParse({ name: values.name, email: values.email, password });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`).join("\n")
    );
  }
  const { name, email } = parsed.data;

  const client = new pg.Client({ connectionString: loadDatabaseUrl() });
  await client.connect();
  try {
    const existing = await client.query("SELECT 1 FROM users WHERE email = $1", [email]);
    if (existing.rowCount) throw new Error(`An account for ${email} already exists.`);

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);
    await client.query("INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)", [
      name,
      email,
      passwordHash,
    ]);
    console.log(`Created administrator ${email}.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
