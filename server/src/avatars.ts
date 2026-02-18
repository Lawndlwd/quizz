import fs from 'fs';
import path from 'path';

const SUPPORTED = new Set(['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp']);

// Where avatar files live at runtime (volume-backed in Docker)
export const avatarsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'avatars')
  : path.join(process.cwd(), '..', 'avatars');

// Bundled defaults shipped with the app
const defaultsDir = path.join(__dirname, '..', 'assets', 'avatars');

/** Called once at startup — creates the folder and seeds defaults if empty. */
export function initAvatars(): void {
  fs.mkdirSync(avatarsDir, { recursive: true });

  // Seed bundled defaults only when the folder is empty
  const existing = fs.readdirSync(avatarsDir).filter(f => SUPPORTED.has(path.extname(f).toLowerCase()));
  if (existing.length === 0 && fs.existsSync(defaultsDir)) {
    for (const file of fs.readdirSync(defaultsDir)) {
      if (SUPPORTED.has(path.extname(file).toLowerCase())) {
        fs.copyFileSync(path.join(defaultsDir, file), path.join(avatarsDir, file));
      }
    }
  }
}

/** Returns public URLs for every avatar file in the folder, sorted by name. */
export function listAvatars(): string[] {
  if (!fs.existsSync(avatarsDir)) return [];
  return fs
    .readdirSync(avatarsDir)
    .filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))
    .sort()
    .map(f => `/avatars/${encodeURIComponent(f)}`);
}
