# QueryLens container image.
#
#   docker compose up --build            builds the `runtime` (app) and `migrate` (one-off tasks) targets
#   docker build --target runtime -t querylens-app .

ARG NODE_IMAGE=node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee
# keep in sync with "packageManager" in package.json
ARG PNPM_VERSION=11.0.0

# ---- base: Node + pnpm
FROM ${NODE_IMAGE} AS base
ARG PNPM_VERSION
WORKDIR /app
RUN npm install --global --no-fund --no-audit "pnpm@${PNPM_VERSION}" \
    && npm cache clean --force


# ---- toolchain: compilers for native modules (bcrypt falls back to node-gyp without a prebuild)
FROM base AS toolchain
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
# manifests only, so dependency layers are reused until the lockfile changes
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./


# ---- deps: every dependency, for building and for the migrate target
FROM toolchain AS deps
RUN pnpm install --frozen-lockfile


# ---- prod-deps: a clean production-only install
FROM toolchain AS prod-deps
RUN pnpm install --frozen-lockfile --prod


# ---- build: `pnpm build` → dist/ (server JS, minified CSS, client modules, images, favicon)
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY scripts/build.js ./scripts/build.js
COPY src ./src
COPY public ./public
RUN pnpm build


# ---- runtime: what the app needs to run, nothing else
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8000 \
    LOG_FILE_PATH=/app/logs

# owned by root and only readable by the app user: the code cannot be modified at runtime.
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY scripts/register-aliases.js scripts/alias-hooks.js ./scripts/

# build-time smoke test with production dependencies only: loads the whole application
# (every import, the "@/" alias hook, the icon files) without starting the server or touching a
# database. Placeholder values exist only for this command and are not stored in the image.
RUN APP_ORIGIN=http://localhost \
    DATABASE_URL=postgres://check:check@localhost:5432/check \
    COOKIES_SECRET=imagebuildcheckimagebuildcheckimagebuildcheck0001 \
    JWT_ACCESS_SECRET=imagebuildcheckimagebuildcheckimagebuildcheck0002 \
    JWT_REFRESH_SECRET=imagebuildcheckimagebuildcheckimagebuildcheck0003 \
    ENCRYPTION_KEY=imagebuildcheckimagebuildcheckimagebuildcheck0004 \
    LOG_FILE_PATH=/tmp/build-check-logs \
    node --import ./scripts/register-aliases.js --input-type=module \
      -e 'await import("./dist/app.js"); console.log("runtime image check: application loads"); process.exit(0)' \
    && rm -rf /tmp/build-check-logs

# only writable path
RUN mkdir -p /app/logs && chown node:node /app/logs

USER node
EXPOSE 8000

# liveness: /healthz is unauthenticated and checks nothing but the process (readiness: /readyz).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Node is PID 1 and handles SIGTERM itself: stops the scheduler, waits up to 10 s for an
# in-flight collection, closes the pool, exits. Give it a stop grace period above 10 s.
STOPSIGNAL SIGTERM
CMD ["node", "--enable-source-maps", "--import", "./scripts/register-aliases.js", "dist/index.js"]


# ---- migrate: one-off tasks that need dev tooling (drizzle-kit), kept out of the runtime image
#   docker compose run --rm migrate                                   (apply migrations)
#   docker compose run --rm migrate node scripts/create-admin.js --name "…" --email …
FROM ${NODE_IMAGE} AS migrate
WORKDIR /app
COPY package.json drizzle.config.ts ./
COPY --from=deps /app/node_modules ./node_modules
COPY drizzle ./drizzle
COPY scripts/create-admin.js ./scripts/create-admin.js
USER node
CMD ["node_modules/.bin/drizzle-kit", "migrate"]
