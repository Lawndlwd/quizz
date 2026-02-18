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

export function loadConfig(): AppConfig {
  const raw = fs.readFileSync(configPath, 'utf-8');
  return JSON.parse(raw) as AppConfig;
}

export function saveConfig(cfg: AppConfig): void {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
}

export const config = loadConfig();
