# ── Base: install deps + compile native modules (sqlite3, bcrypt) ──
FROM node:22-alpine AS base
RUN apk add --no-cache python3 make g++
WORKDIR /app
RUN corepack enable pnpm

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN pnpm install --frozen-lockfile

COPY . .

# ── Build: compile TypeScript (server + client) ──
FROM base AS build
RUN pnpm build

# ── Production: slim runtime image ──
FROM node:22-alpine AS production
WORKDIR /app
RUN corepack enable pnpm

# Copy built output and dependencies
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build /app/server/package.json ./server/
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/node_modules ./server/node_modules

RUN mkdir -p /data && chown -R node:node /data

ENV DATA_DIR=/data
USER node
EXPOSE 3000

CMD ["pnpm", "--filter", "server", "start"]
