# ⚡ Quizz

Real-time multiplayer quiz app. Node + TypeScript + React + Socket.IO + SQLite.

## Quick Start

```bash
pnpm install
pnpm dev
```

- **Admin panel** → http://localhost:5173/admin  (default: `admin` / `admin123`)
- **Player join**  → http://localhost:5173/play

## Structure

```
quizz/
├── config.json        ← game settings (editable in Settings page)
├── quizz.db           ← SQLite database (auto-created)
├── server/            ← Express + Socket.IO API
│   └── src/
│       ├── index.ts
│       ├── db.ts
│       ├── config.ts
│       ├── middleware.ts
│       ├── routes/admin.ts
│       └── socket/index.ts
└── client/            ← Vite + React frontend
    └── src/
        ├── pages/admin/   ← Login, Dashboard, CreateQuiz, GameControl, History, Settings
        └── pages/play/    ← Join, Game
```

## Creating a Quiz via JSON (AI-friendly)

Go to **Create Quiz → JSON Import** and paste:

```json
{
  "title": "Science Trivia",
  "description": "Basic science questions",
  "questions": [
    {
      "text": "What is the speed of light?",
      "options": ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"],
      "correctIndex": 0,
      "baseScore": 500,
      "timeSec": 20
    }
  ]
}
```

You can ask ChatGPT/Claude: *"Generate a 10-question quiz about [topic] in this JSON format: { title, description, questions: [{ text, options: string[4], correctIndex, baseScore: 500, timeSec: 20 }] }"*

## Scoring

| Event | Points |
|---|---|
| Correct answer | `baseScore` (e.g. 500) |
| 1st correct | +200 speed bonus |
| 2nd correct | +150 speed bonus |
| 3rd correct | +100 speed bonus |
| 4th+ correct | +50 speed bonus |
| Wrong answer | 0 |

Speed bonuses are configurable in `config.json` or the Settings page.

## Production Build

```bash
pnpm build          # builds client → client/dist, server → server/dist
pnpm start          # runs server which serves the built client
```
