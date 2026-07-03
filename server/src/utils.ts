import type { DbQuestion } from './types';

export function normalizeImageUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  return trimmed || undefined;
}

export function normalizeOptionalText(text?: string | null): string | undefined {
  const trimmed = text?.trim();
  return trimmed || undefined;
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
