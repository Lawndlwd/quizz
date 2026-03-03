import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from './types';

// All persistent data lives in DATA_DIR (Docker) or <project-root>/data/ (local dev)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
const configPath = path.join(dataDir, 'config.json');

// Defaults ensure any field added to the codebase after a deployment
// still has a sane value even if the persisted config.json pre-dates it.
const DEFAULTS: AppConfig = {
  port: 3000,
  appName: '',
  appSubtitle: '',
  jwtSecret: 'change-this-secret-in-production',
  questionTimeSec: 20,
  defaultBaseScore: 500,
  speedBonusMax: 200,
  speedBonusMin: 10,
  maxPlayersPerSession: 50,
  showLeaderboardAfterQuestion: true,
  streakBonusEnabled: true,
  streakMinimum: 2,
  streakBonusBase: 50,
  resultsAutoAdvanceSec: 0,
};

export function loadConfig(): AppConfig {
  // On first run, create the data dir and seed a default config
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(DEFAULTS, null, 2), 'utf-8');
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  const saved = JSON.parse(raw) as Partial<AppConfig>;
  // Merge: saved values win; any key missing from the file falls back to DEFAULTS
  const cfg = { ...DEFAULTS, ...saved };
  // Env vars always win over file — useful for Docker deployments
  if (process.env.JWT_SECRET) cfg.jwtSecret = process.env.JWT_SECRET;
  return cfg;
}

export function saveConfig(cfg: AppConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
}

export const config = loadConfig();
