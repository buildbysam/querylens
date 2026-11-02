import { config, LogLevel } from "@/config.js";
import { createMiddleware } from "hono/factory";
import { createLogger, format, Logger, transports } from "winston";
import "winston-daily-rotate-file";

export interface WinstonOptions {
  level: LogLevel;
  filePath: string;
}

function createWinstonLogger(options: WinstonOptions) {
  const logger = createLogger({
    level: options.level,
    format: format.combine(format.json(), format.timestamp()),
    transports: [
      new transports.DailyRotateFile({
        filename: `${options.filePath}/error-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        level: "error",
        maxSize: "20m",
        maxFiles: "30d",
      }),
      new transports.DailyRotateFile({
        filename: `${options.filePath}/combined-%DATE%.log`,
        datePattern: "YYYY-MM-DD",
        maxSize: "20m",
        maxFiles: "14d",
      }),
    ],
  });

  if (process.env.NODE_ENV === "development") {
    logger.add(new transports.Console());
  }

  return logger;
}

class LoggerService {
  private readonly winston: Logger;
  private readonly boundContext?: string;

  constructor() {
    this.winston = createWinstonLogger({
      level: config.isProduction ? LogLevel.Info : LogLevel.Debug,
      filePath: config.get("LOG_FILE_PATH") ?? "logs",
    });
  }

  log(message: string, context?: string) {
    this.winston.info(message, { context });
  }

  error(message: string, trace?: string | Error, context?: string): void {
    this.winston.error(message, {
      context,
      ...(trace instanceof Error
        ? {
            err: {
              name: trace.name,
              message: trace.message,
              stack: trace.stack,
            },
          }
        : trace
          ? { stack: trace }
          : {}),
    });
  }

  warn(message: string, context?: string) {
    this.winston.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.winston.debug(message, { context });
  }
}

export const logger = new LoggerService();

export const loggerMiddleware = createMiddleware(async (c, next) => {
  const start = performance.now();
  await next();
  const duration = Math.round(performance.now() - start);
  const logMessage = `${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} - ${duration}ms`;
  logger.log(logMessage, "HTTP");
});
