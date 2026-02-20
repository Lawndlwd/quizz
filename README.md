# Quizz

Self-hosted real-time multiplayer quiz platform. Players join with a room code from any device — no app, no account.

## Deploy

```sh
curl -O https://raw.githubusercontent.com/Lawndlwd/quizz/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/Lawndlwd/quizz/main/Caddyfile
```

Create a `.env` file:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme
JWT_SECRET=your-random-secret

# Optional — enables automatic HTTPS via Let's Encrypt
# DOMAIN=quiz.example.com
```

```sh
docker compose up -d
```

- Player join: `http://your-server/play`
- Admin panel: `http://your-server/admin`

The Docker image is pulled automatically from `ghcr.io/lawndlwd/quizz:latest`.

## Scoring

Each correct answer earns:

- **Base score** — configurable per question (default 500 pts)
- **Speed bonus** — top answerers get extra points (1st: +200, 2nd: +150, 3rd: +100, 4th: +50, rest: +25)
- **Streak bonus** — consecutive correct answers add `(streak − 2) × 50 pts` starting at 3 in a row

## Development

Requirements: Node.js 20+, pnpm

```sh
pnpm install
pnpm dev
```

- App: http://localhost:5173
- Admin: http://localhost:5173/admin (default: `admin` / `admin`)

## Stack

- **Frontend** — React, TypeScript, Vite
- **Backend** — Node.js, Express, Socket.IO
- **Database** — SQLite
- **Proxy** — Caddy (auto HTTPS)
