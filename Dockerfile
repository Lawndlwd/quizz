FROM node:22-slim

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/

COPY . .

RUN pnpm install --frozen-lockfile
RUN cd /app/node_modules/.pnpm/sqlite3@5.1.7/node_modules/sqlite3 && npm rebuild --build-from-source

RUN pnpm build

EXPOSE 3000

ENV DATA_DIR=/data

CMD ["pnpm", "--filter", "server", "start"]
