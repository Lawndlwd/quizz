import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

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

/** Saves a single avatar provided as a data: URL and returns its public URL. */
export function saveAvatarFromDataUrl(dataUrl: string): string {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,/.exec(dataUrl);
  if (!match) {
    throw new Error('Invalid data URL');
  }

  const mime = match[1].toLowerCase();
  let ext = '';
  if (mime === 'image/png') ext = '.png';
  else if (mime === 'image/jpeg' || mime === 'image/jpg') ext = '.jpg';
  else if (mime === 'image/gif') ext = '.gif';
  else if (mime === 'image/svg+xml') ext = '.svg';
  else if (mime === 'image/webp') ext = '.webp';
  else throw new Error('Unsupported image type');

  if (!SUPPORTED.has(ext)) {
    throw new Error('Unsupported image extension');
  }

  const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  fs.mkdirSync(avatarsDir, { recursive: true });
  const filename = `${uuid()}${ext}`;
  const filepath = path.join(avatarsDir, filename);
  fs.writeFileSync(filepath, buffer);

  return `/avatars/${encodeURIComponent(filename)}`;
}

/** Saves multiple avatars from data URLs, skipping invalid entries. */
export function saveAvatarsFromDataUrls(dataUrls: string[]): string[] {
  const urls: string[] = [];
  for (const url of dataUrls) {
    if (typeof url !== 'string' || !url.startsWith('data:')) continue;
    try {
      urls.push(saveAvatarFromDataUrl(url));
    } catch {
      // ignore invalid/unsupported entries
    }
  }
  return urls;
}
