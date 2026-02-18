import fs from 'fs';
import path from 'path';
import { AppConfig } from './types';

// config.json lives at the workspace root, one level above server/
const configPath = path.join(process.cwd(), '..', 'config.json');

export function loadConfig(): AppConfig {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as AppConfig;
}

export function saveConfig(cfg: AppConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
}

export const config = loadConfig();
