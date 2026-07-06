import type { DbQuestion } from './types';

/** SQLite may return is_banned as number or string — treat 1 as banned. */
export function isUserBanned(is_banned: unknown): boolean {
  return Number(is_banned) === 1;
}

export function normalizeImageUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  return trimmed || undefined;
}

export function normalizeOptionalText(text?: string | null): string | undefined {
  const trimmed = text?.trim();
  return trimmed || undefined;
}

/** Extract the 11-char video id from any common YouTube URL (or a bare id). */
export function parseYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const s = url.trim();
  const m = s.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  if (m) return m[1];
  if (/^[\w-]{11}$/.test(s)) return s;
  return null;
}

/**
 * Validate a question's media pair before persisting. Only YouTube-backed
 * audio/video is supported — the client picker enforces this, but JSON import
 * and direct API calls bypass it, so garbage would otherwise be stored and
 * pushed to every player as silently-blank media.
 */
export function normalizeQuestionMedia(
  mediaType?: string | null,
  mediaUrl?: string | null,
): { mediaUrl: string | null; mediaType: string | null } {
  if ((mediaType === 'audio' || mediaType === 'video') && mediaUrl && parseYouTubeId(mediaUrl)) {
    return { mediaUrl: mediaUrl.trim(), mediaType };
  }
  return { mediaUrl: null, mediaType: null };
}

/** Clean a tag list → trimmed, non-empty, de-duped, capped — stored as a JSON string. */
export function normalizeTags(tags?: string[] | null): string | null {
  if (!Array.isArray(tags)) return null;
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of tags) {
    const t = String(raw).trim().slice(0, 24);
    const key = t.toLowerCase();
    if (t && !seen.has(key)) {
      seen.add(key);
      cleaned.push(t);
    }
    if (cleaned.length >= 12) break;
  }
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

/** Parse a question DB row's JSON-string columns for API responses. */
export function parseQuestionRow(q: DbQuestion) {
  return {
    ...q,
    options: JSON.parse(q.options),
    correct_indices: q.correct_indices ? JSON.parse(q.correct_indices) : null,
    blanks: q.blanks ? JSON.parse(q.blanks) : null,
    geo: q.geo ? JSON.parse(q.geo) : null,
    tags: q.tags ? JSON.parse(q.tags) : null,
  };
}
