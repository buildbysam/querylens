ARG NODE_VERSION=22

# ---- deps: install 
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app

# toolchain for bcrypt 
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@11.0.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build: compile Tailwind CSS, copy client modules
FROM deps AS build
WORKDIR /app
COPY . .
RUN mkdir -p dist/public/css dist/public/images \
  && node_modules/.bin/tailwindcss -i ./src/global.css -o ./dist/public/css/styles.css --minify \
  && cp -r public/js dist/public/js

# ---- runtime
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
  PORT=8000

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json tsconfig.json drizzle.config.ts ./
COPY --chown=node:node src ./src
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node scripts/create-admin.js ./scripts/create-admin.js
COPY --from=build --chown=node:node /app/dist/public ./dist/public

RUN mkdir -p /app/logs && chown node:node /app/logs

USER node
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# node is PID 1 so SIGTERM reaches the app's own shutdown handler
CMD ["node", "--import", "tsx", "src/index.ts"]
