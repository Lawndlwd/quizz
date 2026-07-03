import fs from 'node:fs';
import path from 'node:path';
import type { AppConfig } from './types';

// All persistent data lives in DATA_DIR (Docker) or <project-root>/data/ (local dev)
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), '..', 'data');
const configPath = path.join(dataDir, 'config.json');

// Sentinel: a config/env that still carries this value is treated as "unset".
const PLACEHOLDER_SECRET = 'change-this-secret-in-production';

// Defaults ensure any field added to the codebase after a deployment
// still has a sane value even if the persisted config.json pre-dates it.
const DEFAULTS: AppConfig = {
  port: 3000,
  appName: '',
  appSubtitle: '',
  jwtSecret: PLACEHOLDER_SECRET,
  allowedDomain: '',
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
  chooseQuizMaker: false,
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
  if (process.env.ALLOWED_DOMAIN !== undefined) cfg.allowedDomain = process.env.ALLOWED_DOMAIN;

  // Refuse to boot with a missing or well-known JWT secret: it would let anyone
  // forge super-admin tokens. Operators must set a strong JWT_SECRET.
  if (!cfg.jwtSecret || cfg.jwtSecret === PLACEHOLDER_SECRET || cfg.jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET is unset, uses the built-in placeholder, or is shorter than 32 chars. ' +
        'Set a strong random JWT_SECRET (e.g. `openssl rand -hex 32`) before starting.',
    );
  }
  return cfg;
}

export function saveConfig(cfg: AppConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
}

/** Config safe to expose over the API — secrets stripped. */
export function toPublicConfig(cfg: AppConfig = config): Omit<AppConfig, 'jwtSecret'> {
  const { jwtSecret: _jwtSecret, ...publicConfig } = cfg;
  return publicConfig;
}

export const config = loadConfig();
