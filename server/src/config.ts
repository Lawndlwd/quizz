import fs from 'fs';
import path from 'path';
import { AppConfig } from './types';

const defaultConfigPath = path.join(process.cwd(), '..', 'config.json');
const configPath = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'config.json')
  : defaultConfigPath;

// On first run inside Docker the data volume is empty — seed from bundled default
if (process.env.DATA_DIR && !fs.existsSync(configPath)) {
  fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
  fs.copyFileSync(defaultConfigPath, configPath);
}

// Defaults ensure any field added to the codebase after a deployment
// still has a sane value even if the persisted config.json pre-dates it.
const DEFAULTS: AppConfig = {
  port: 3000,
  appName: '',
  adminUsername: 'admin',
  adminPassword: 'admin',
  jwtSecret: 'change-this-secret-in-production',
  questionTimeSec: 20,
  lobbyTimeoutMin: 30,
  defaultBaseScore: 500,
  speedBonuses: [200, 150, 100, 50],
  defaultSpeedBonus: 25,
  maxPlayersPerSession: 50,
  showLeaderboardAfterQuestion: true,
  allowLateJoin: false,
  streakBonusEnabled: true,
  streakMinimum: 2,
  streakBonusBase: 50,
};

export function loadConfig(): AppConfig {
  const raw = fs.readFileSync(configPath, 'utf-8');
  const saved = JSON.parse(raw) as Partial<AppConfig>;
  // Merge: saved values win; any key missing from the file falls back to DEFAULTS
  return { ...DEFAULTS, ...saved };
}

export function saveConfig(cfg: AppConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
}

export const config = loadConfig();
