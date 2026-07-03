# Quizz

Self-hosted real-time multiplayer quiz platform. Players join with a 6-digit PIN from any device — no app, no account.

https://github.com/user-attachments/assets/7fb399b8-2768-45ca-8501-c9042cfe27e7

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

## Question types

| Type | How it works |
|---|---|
| **Single choice** | One correct option out of several. The only type that supports the 50/50 joker. |
| **Multiple answers** | Several correct options — the player must select exactly the right set. |
| **True / False** | Two fixed options. |
| **Open text** | Free text input, matched case- and whitespace-insensitively. |
| **Closest to** | Numeric guess on a slider within a configured range. Exact match scores full points; otherwise partial credit by distance. |
| **Fill in the blank** | Question text with `___` markers; each blank accepts one or more answers. Partial credit per blank matched. |
| **Ordering** | Arrange items in the correct order (items are shuffled per question). Partial credit per item in the right place. |
| **Locate on map** | Drop a pin on a map. Within 50 km counts as correct; beyond that, points decay exponentially with distance. |

Each question can also have:

- **Base score** and **time limit** (defaults: 500 pts, 20 s)
- **Image**, or **YouTube audio/video** with a start offset (`?t=SECONDS`) — audio plays hidden for music rounds
- **Markdown code blocks** in the question text (great for programming quizzes)
- **Image URLs as answer options** (mixable with text)
- **Explanation** shown after the reveal
- **Tags** (topic, difficulty) aggregated into the lobby intro screen

## Scoring

- **Base score** — configurable per question (default 500 pts) for a correct answer
- **Speed bonus** — order-based: the first correct answer gets +200, decaying linearly down to +10 for the last
- **Streak bonus** — from the 3rd consecutive correct answer, +50 pts per extra streak level
- **Partial credit** — closest-to, fill-blank, ordering, and map questions award a fraction of the base score; speed/streak bonuses only apply to fully correct answers
- The host can remove a player's points for a specific question during the game

All values (base score, bonus ranges, streak rules) are editable in the admin settings.

## Running a game

1. **Create a quiz** — build it in the editor, or paste AI-generated JSON (an import template covering every question type is provided)
2. **Start a session** — a unique 6-digit PIN is generated; players join from their phones
3. **Lobby** — players appear live; a pre-game modal lets you enable jokers and tweak streak scoring for this game only
4. **Play** — server-side timer per question; auto-reveals when time runs out or everyone answered. The host can finish a question early, skip to the next, or end the game, and gets a private preview of the upcoming question
5. **Reveal** — correct answer, per-option vote distribution, explanation, and (optionally) the live leaderboard between questions
6. **Podium** — confetti finale; optionally a spinner picks a random player as the next quiz maker

Auto-advance between questions is configurable (default: manual).

### Jokers (opt-in per game, once each per player)

- **Pass** — skip a question and still earn a configured score
- **50/50** — eliminate two wrong options (single choice only)

### Players

- Join with PIN + username + avatar
- Live answered-count while waiting; score, streak, and rank after each question
- **Reconnect-safe** — reloading the page or switching tabs restores the game state, even across a server restart

## Admin & accounts

- **Two roles** — super admin and regular users; users only see and host their own quizzes
- **User management** (super admin) — list users, ban/unban, reset passwords, delete
- **Registration** can be restricted to a configured email domain
- **Session history** — past games with per-player answers, force-end running sessions
- **Settings UI** — app name/subtitle, timing, scoring, leaderboard visibility, max players (default 50), auto-advance
- **Avatar packs** — bulk-upload avatar images for players to pick from

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
