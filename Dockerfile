FROM node:22-alpine

WORKDIR /app

# Build tools needed for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies first (layer cache)
# Force better-sqlite3 to build from source for Alpine (musl libc, not glibc)
ENV npm_config_build_from_source=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

EXPOSE 3000

# Persistent data (SQLite + config.json) is mounted here at runtime
ENV DATA_DIR=/data

CMD ["pnpm", "--filter", "server", "start"]
