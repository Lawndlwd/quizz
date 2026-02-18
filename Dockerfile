FROM node:22-slim

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && \
    apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild better-sqlite3 to ensure it's compiled correctly
RUN pnpm rebuild better-sqlite3

# Copy source and build
COPY . .
RUN pnpm build

EXPOSE 3000

ENV DATA_DIR=/data

CMD ["pnpm", "--filter", "server", "start"]
```

**Key additions:**
1. Proper multi-line format for `apt-get` (easier to debug)
2. **`RUN pnpm rebuild better-sqlite3`** - This is critical! It forces a rebuild after installation

**To verify it worked, check your GitHub Actions build logs** - you should see output like:
```
> better-sqlite3@9.6.0 build-release
> node-gyp rebuild --release
