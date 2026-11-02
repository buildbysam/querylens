import * as dotenv from "dotenv";
import * as fs from "node:fs";
import z from "zod";

export const postgresUrlSchema = (name: string) =>
  z
    .string()
    .min(1, { message: `${name} must not be empty` })
    .regex(/^postgres(ql)?:\/\/.+/, {
      message: `${name} must be a valid PostgreSQL DSN (e.g. postgresql://user:pass@host:5432/db)`,
    });

export enum NodeEnv {
  Development = "development",
  Production = "production",
  Test = "test",
}

export interface IApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data?: T;
}

export enum LogLevel {
  Error = "error",
  Warn = "warn",
  Info = "info",
  Debug = "debug",
  Verbose = "verbose",
}

export const SECRET_PLACEHOLDERS = ["change", "replace", "random-string", "your-secret", "secret", "password"] as const;

export const EnvironmentVariablesSchema = z.object({
  NODE_ENV: z.enum(NodeEnv, {
    message: `NODE_ENV must be one of: ${Object.values(NodeEnv).join(", ")}`,
  }),
  PORT: z.coerce
    .number()
    .int({ message: "PORT must be an integer" })
    .min(1, { message: "PORT must be >= 1" })
    .max(65535, { message: "PORT must be <= 65535" }),
  DATABASE_URL: postgresUrlSchema("DATABASE_URL"),
  COOKIES_SECRET: z
    .string()
    .transform((value) => {
      if (SECRET_PLACEHOLDERS.some((placeholder) => value.toLowerCase().includes(placeholder))) {
        return "";
      }
      return value;
    })
    .pipe(
      z.string().min(48, {
        message: "COOKIES_SECRET must be at least 48 characters long",
      })
    ),
  LOG_LEVEL: z
    .enum(LogLevel, {
      message: `LOG_LEVEL must be one of: ${Object.values(LogLevel).join(", ")}`,
    })
    .optional(),
  LOG_FILE_PATH: z
    .string({
      message: "LOG_FILE_PATH must be a string",
    })
    .min(1, {
      message: "LOG_FILE_PATH must not be empty when set",
    })
    .regex(/^(\/|[A-Za-z]:[\\/])/, {
      message: "LOG_FILE_PATH must be an absolute path (e.g. /var/log/app.log or C:\\logs\\app.log)",
    })
    .optional(),
});

export type EnvironmentVariables = z.infer<typeof EnvironmentVariablesSchema>;

function formatErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "config";
    return `${path}: ${issue.message}`;
  });
}

export function validate<T extends Object>(config: T): EnvironmentVariables {
  const result = EnvironmentVariablesSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${formatErrors(result.error).join("\n")}`);
  }
  return result.data;
}

export interface ConfigOptions {
  envFilePath?: string | string[];
  ignoreEnvFile?: boolean;
  validate?: (env: Record<string, unknown>) => unknown;
}

class Config {
  private readonly config: Record<string, unknown>;
  constructor(options: ConfigOptions = {}) {
    const { envFilePath = ".env", ignoreEnvFile = false, validate } = options;
    let config: Record<string, unknown> = {};

    if (!ignoreEnvFile) {
      const paths = Array.isArray(envFilePath) ? envFilePath : [envFilePath];

      for (const path of paths) {
        if (!fs.existsSync(path)) {
          continue;
        }
        const parsed = dotenv.parse(fs.readFileSync(path));
        config = {
          ...parsed,
          ...config,
        };
      }
    }

    // existing process.env takes precedence over env files.
    config = {
      ...config,
      ...process.env,
    };

    if (validate) {
      config = validate(config) as Record<string, unknown>;
    }
    this.config = config;
  }

  get<T = string>(propertyPath: string): T | undefined {
    return this.config[propertyPath] as T | undefined;
  }

  getOrThrow<T = string>(propertyPath: string): T {
    const value = this.get<T>(propertyPath);
    if (value === undefined || value === null) {
      throw new Error(`Configuration key "${propertyPath}" is missing`);
    }
    return value;
  }

  get isProduction() {
    return this.getOrThrow("NODE_ENV") === NodeEnv.Production;
  }
}

export const config = new Config({
  envFilePath: [`.env.${process.env.NODE_ENV ?? NodeEnv.Development}.local`, ".env.local", ".env"],
  validate,
});
