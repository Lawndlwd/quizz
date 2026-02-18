# Quizz — Documentation

> **Free to use. - Fully AI generated** Clone the repo, run `docker compose up --build`, and you're live. No accounts, no subscriptions, no cloud lock-in.

---

## Table of Contents

1. [What is Quizz?](#what-is-quizz)
2. [Quick Start (Docker)](#quick-start-docker)
3. [How It Works](#how-it-works)
   - [Admin Flow](#admin-flow)
   - [Player Flow](#player-flow)
4. [Scoring System](#scoring-system)
   - [Base Score](#base-score)
   - [Speed Bonus](#speed-bonus)
   - [Streak Bonus](#streak-bonus)
   - [Example Round](#example-round)
5. [Creating Quizzes](#creating-quizzes)
   - [Manual Builder](#manual-builder)
   - [JSON Import](#json-import)
6. [Editing Quizzes](#editing-quizzes)
7. [Game Settings](#game-settings)
8. [Architecture Overview](#architecture-overview)
9. [Project Structure](#project-structure)
10. [Local Development](#local-development)
11. [Configuration Reference](#configuration-reference)
12. [Contributing](#contributing)
13. [License](#license)

---

## What is Quizz?

Quizz is a **self-hosted, real-time multiplayer quiz platform** — think Kahoot-style, but running entirely on your own infrastructure. Players join via a 6-digit PIN on any device (no app install needed), and the admin controls the game from a separate dashboard.

**Key features:**
- Real-time gameplay via WebSockets (Socket.IO)
- Speed-based scoring: faster correct answers earn more bonus points
- Streak bonuses: consecutive correct answers multiply your score boost
- Admin panel with quiz creation, session history, and live game control
- Persistent storage with SQLite (no external database needed)
- Zero config deployment via Docker Compose

---

## Quick Start (Docker)

**Requirements:** Docker and Docker Compose installed on your machine.

```bash
git clone https://github.com/your-username/quizz.git
cd quizz
docker compose up --build
```

The app will be available at **http://localhost:3000**.

- Player join screen: `http://localhost:3000/play`
- Admin panel: `http://localhost:3000/admin`
  - Default credentials: `admin` / `admin123`
  - **Change these immediately in Settings after first login.**

Data (database + config) is stored in a Docker volume named `quizz-data`, so it persists across container restarts and rebuilds.

### Updating

```bash
git pull
docker compose up --build -d
```

---

## How It Works

### Admin Flow

1. **Login** at `/admin/login` with your admin credentials.
2. **Create a quiz** using the Manual Builder or paste AI-generated JSON.
3. From the **Dashboard**, click **▶ Start** next to a quiz to create a game session. A unique 6-digit PIN is generated.
4. The **Game Control** screen shows the lobby. Share the PIN (or the URL `/play/PIN`) with players.
5. Once players have joined, click **Start Game** to begin.
6. After each question's timer expires (or all players have answered), results and a leaderboard are shown. Click **Next Question** to continue.
7. After the last question, the final leaderboard is displayed.
8. All session results are saved in **History** for later review.

### Player Flow

1. Open the app on any browser-equipped device.
2. Enter the **6-digit PIN** and choose a **username**.
3. Wait in the lobby until the admin starts the game.
4. For each question, tap/click one of the answer options before the timer runs out.
5. Immediate feedback is shown: correct/wrong + points earned this round (including any bonuses).
6. A leaderboard appears between questions.
7. Final scores are shown when the game ends.

---

## Scoring System

Every correct answer earns points from up to three sources:

### Base Score

Each question has a configurable **Base Score** (default: **500 pts**).

- Set per-question when creating/editing a quiz.
- The global default is configurable in Settings.
- Wrong answers always earn **0 points**.

### Speed Bonus

The first players to answer correctly earn extra bonus points based on order:

| Position | Default Bonus |
|----------|--------------|
| 1st correct | +200 pts |
| 2nd correct | +150 pts |
| 3rd correct | +100 pts |
| 4th correct | +50 pts |
| 5th+ correct | +25 pts (default speed bonus) |

You can add as many speed bonus tiers as you want in **Settings → Speed Bonuses** — click **+ Add Tier** to extend the list. Players beyond the last tier receive the **Default Speed Bonus**.

### Streak Bonus

Consecutive correct answers across questions earn an escalating streak bonus:

```
Streak formula: bonus = max(0, streak - streakMinimum) × streakBonusBase
```

With default settings (`streakMinimum = 2`, `streakBonusBase = 50`):

| Streak | Extra Bonus |
|--------|------------|
| 1 correct in a row | +0 pts |
| 2 correct in a row | +0 pts |
| 3 correct in a row | +50 pts |
| 4 correct in a row | +100 pts |
| 5 correct in a row | +150 pts |
| N correct in a row | +(N − 2) × 50 pts |

A single wrong answer **resets the streak to 0**.

Streak bonuses can be disabled, or tuned, in **Settings → Streak Bonus**.

### Example Round

Player answers Question 3 correctly (3rd in a row), and is the 2nd fastest:

| Component | Points |
|-----------|--------|
| Base Score | +500 |
| Speed Bonus (2nd correct) | +150 |
| Streak Bonus (3-streak) | +50 |
| **Total this question** | **+700** |

---

## Creating Quizzes

### Manual Builder

Navigate to **Dashboard → Create Quiz → Manual Builder**.

- Enter a **title** and optional **description**.
- Add as many questions as you need with the **+ Add Question** button.
- Each question supports:
  - Question text
  - Unlimited answer options (minimum 2) — add or remove with **+ Add Option** / ✕
  - One correct answer (selected from a dropdown)
  - Per-question **Base Score** override
  - Per-question **Time limit** (seconds)

### JSON Import

Navigate to **Dashboard → Create Quiz → JSON Import** and paste a JSON object following this schema:

```json
{
  "title": "My Quiz",
  "description": "Optional description",
  "questions": [
    {
      "text": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correctIndex": 2,
      "baseScore": 500,
      "timeSec": 20
    },
    {
      "text": "Which planet is closest to the Sun?",
      "options": ["Venus", "Mercury", "Earth", "Mars"],
      "correctIndex": 1,
      "baseScore": 700
    }
  ]
}
```

**Tip:** Ask an AI (ChatGPT, Claude, etc.) to generate quiz JSON following the schema above. This is the fastest way to create large quizzes.

---

## Editing Quizzes

From the **Dashboard**, click **✎ Edit** next to any quiz. The Edit Quiz page lets you:

- Rename the quiz title and description
- Edit question text and options
- Add or remove options per question
- Change correct answers, base scores, and time limits
- Add or remove questions

> **Note:** Editing a quiz does not affect sessions that have already started or finished. Only future sessions will use the updated content.

---

## Game Settings

Navigate to **Admin → Settings** to configure game behaviour:

| Setting | Default | Description |
|---------|---------|-------------|
| Default Question Time | 20s | Timer per question (can be overridden per question) |
| Default Base Score | 500 | Points for a correct answer (can be overridden per question) |
| Default Speed Bonus | 25 | Points for players beyond the speed bonus tier list |
| Speed Bonuses | 200, 150, 100, 50 | Per-position bonus tiers (expandable) |
| Max Players Per Session | 50 | Hard cap on players per game |
| Allow Late Join | Off | Let players join after the game has started |
| Streak Bonus Enabled | On | Enable/disable streak bonuses entirely |
| Streak Minimum | 2 | Streak must exceed this to earn a bonus |
| Streak Bonus Base | 50 | Points per extra streak level above minimum |
| Admin Username | admin | Login username |
| Admin Password | admin123 | Login password |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        Docker Container                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │               Node.js / Express Server           │   │
│  │                                                  │   │
│  │  ┌─────────────┐   ┌──────────────────────────┐ │   │
│  │  │  REST API   │   │      Socket.IO           │ │   │
│  │  │ /api/admin/*│   │  (real-time game events) │ │   │
│  │  └─────────────┘   └──────────────────────────┘ │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │          SQLite Database                 │   │   │
│  │  │   (quizzes, questions, sessions,         │   │   │
│  │  │    players, answers)                     │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │     React SPA (served as static files)   │   │   │
│  │  │  /admin/* — Admin panel                  │   │   │
│  │  │  /play/*  — Player interface             │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────┘   │
│                          :3000                          │
└─────────────────────────────────────────────────────────┘
          │
          ▼  (optional)
┌────────────────────┐
│   Caddy / Nginx    │  ← Reverse proxy with TLS
│   :80 / :443       │
└────────────────────┘
```

**Tech stack:**

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Custom CSS design system + Tailwind CSS v4 utilities |
| Real-time | Socket.IO (WebSockets) |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (HTTP-only cookie) |
| Package Manager | pnpm workspaces |
| Container | Docker + Docker Compose |
| Reverse Proxy | Caddy (optional) |

---

## Project Structure

```
quizz/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/         # Admin panel pages
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── CreateQuiz.tsx
│   │   │   │   ├── EditQuiz.tsx
│   │   │   │   ├── GameControl.tsx
│   │   │   │   ├── History.tsx
│   │   │   │   ├── SessionDetail.tsx
│   │   │   │   └── Settings.tsx
│   │   │   └── play/          # Player-facing pages
│   │   │       ├── Join.tsx
│   │   │       └── Game.tsx
│   │   ├── components/
│   │   │   └── AdminNav.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── hooks/
│   │   │   └── useSocket.ts
│   │   ├── styles/
│   │   │   └── index.css      # Global CSS + Tailwind import
│   │   ├── types.ts
│   │   └── App.tsx
│   └── package.json
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── admin.ts       # All REST endpoints
│   │   ├── socket/
│   │   │   ├── index.ts       # Socket.IO event handlers + scoring
│   │   │   └── gameState.ts   # In-memory active session state
│   │   ├── db.ts              # SQLite schema + connection
│   │   ├── config.ts          # Config file load/save
│   │   ├── middleware.ts      # JWT auth middleware
│   │   ├── types.ts           # TypeScript interfaces
│   │   └── index.ts           # Express app entry point
│   └── package.json
│
├── config.json                # Default app configuration
├── docker-compose.yml
├── Dockerfile
├── Caddyfile                  # Optional reverse proxy config
├── pnpm-workspace.yaml
└── README.md
```

---

## Local Development

**Prerequisites:** Node.js 22+, pnpm

```bash
# Install dependencies
pnpm install

# Start the backend (port 3000)
pnpm --filter server dev

# In another terminal, start the frontend (port 5173, proxies API to 3000)
pnpm --filter client dev
```

Open `http://localhost:5173` for the app in development mode (with hot reload).

### Building

```bash
# Build both packages
pnpm build
```

The client output goes to `client/dist/` and is served as static files by the Express server in production.

---

## Configuration Reference

The `config.json` file at the project root is the default configuration. In Docker, a copy is placed in the `/data` volume on first run and all changes are persisted there.

```json
{
  "port": 3000,
  "adminUsername": "admin",
  "adminPassword": "admin123",
  "jwtSecret": "change-this-secret-in-production",
  "questionTimeSec": 20,
  "lobbyTimeoutMin": 30,
  "defaultBaseScore": 500,
  "speedBonuses": [200, 150, 100, 50],
  "defaultSpeedBonus": 25,
  "maxPlayersPerSession": 50,
  "showLeaderboardAfterQuestion": true,
  "allowLateJoin": false,
  "streakBonusEnabled": true,
  "streakMinimum": 2,
  "streakBonusBase": 50
}
```

> **Important:** Change `jwtSecret` and `adminPassword` before exposing the app to the public internet.

All settings (except `port` and `jwtSecret`) can also be changed at runtime via the admin Settings page without restarting the server.

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository and clone your fork locally.
2. Create a **feature branch**: `git checkout -b feat/my-feature`
3. Install dependencies: `pnpm install`
4. Make your changes. The project is a TypeScript monorepo with `client` and `server` packages.
5. Run a build to verify everything compiles: `pnpm build`
6. Open a **pull request** against the `main` branch with a clear description of what you changed and why.

### Ideas for contributions

- Question image support (upload or URL)
- Team/group mode (players compete as teams)
- Quiz import/export (JSON file download)
- Quiz categories and tagging
- Timed lobby auto-start
- Player avatars or emoji selection
- Webhook notifications on game end
- More question types (true/false, open text, ordering)
- Accessibility improvements

### Code style

- TypeScript strict mode throughout
- No external state management library (plain React context + hooks)
- Keep the server stateless between requests; active game state lives in memory (`gameState.ts`)
- SQLite transactions for all multi-step writes

---

## License

This project is **free to use** for any purpose — personal, educational, or commercial. Do whatever you want with it.

```
MIT License — Copyright (c) 2025 Contributors
```
