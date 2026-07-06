import {
  ArrowUpDown,
  Circle,
  Diamond,
  Gauge,
  Hexagon,
  ListChecks,
  type LucideIcon,
  MapPin,
  PenLine,
  Square,
  SquareDashed,
  Star,
  Target,
  ToggleLeft,
  Triangle,
} from 'lucide-react';
import type { GeoPoint, ImportPayload, ImportQuestion, QuestionType } from '@/types';
export type QuestionWithKey = ImportQuestion & { _key: string };

export function withKey(q: ImportQuestion): QuestionWithKey {
  return { ...q, _key: crypto.randomUUID() };
}

export function optionLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Color-Quadrants design system — index-mapped answer colors + geometric glyphs.
 * A/B/C/D → Red ▲ · Blue ◆ · Gold ● · Green ■. Wraps for >4 options.
 */
export const QUAD_COLORS = ['#e2455a', '#2a7de1', '#f5a623', '#1f9d57', '#a855f7', '#0ea5e9'];
export const QUAD_GLYPHS = ['▲', '◆', '●', '■', '★', '⬢'];
/** lucide equivalents of QUAD_GLYPHS, index-matched. */
export const QUAD_ICONS: LucideIcon[] = [Triangle, Diamond, Circle, Square, Star, Hexagon];

export function quadColor(index: number): string {
  return QUAD_COLORS[index % QUAD_COLORS.length];
}

export function quadGlyph(index: number): string {
  return QUAD_GLYPHS[index % QUAD_GLYPHS.length];
}

export function quadIcon(index: number): LucideIcon {
  return QUAD_ICONS[index % QUAD_ICONS.length];
}

export function hasQuestionImage(url?: string | null): url is string {
  return typeof url === 'string' && url.trim().length > 0;
}

/**
 * True when a value looks like an image reference we can try to render as an
 * <img>: a `data:image/…` URI, or a whitespace-free http(s)/root-relative URL.
 * The file extension is intentionally optional — many image hosts (Unsplash,
 * Cloudinary, …) serve images from extensionless URLs like
 * `https://images.unsplash.com/photo-123?w=600`. Callers should still handle
 * the load-failure case (e.g. fall back to text) since a plain link also
 * matches. Used so an answer option can be an image instead of text.
 */
export function isImageUrl(value?: string | null): value is string {
  if (typeof value !== 'string') return false;
  const s = value.trim();
  if (!s || /\s/.test(s)) return false;
  if (s.startsWith('data:image/')) return true;
  return /^(?:https?:\/\/|\/)\S+$/i.test(s);
}

// Fenced code block: ```lang\n…code…\n``` (lang optional). Single source of
// truth for both the game renderer (QuestionText) and the studio block editor
// (QuestionTextEditor) so their split semantics can't drift apart.
const FENCE = /```([a-zA-Z0-9+#.-]*)\n?([\s\S]*?)```/g;

export interface FencedSegment {
  type: 'text' | 'code';
  lang: string;
  content: string;
}

/** Split a markdown string into alternating text / fenced-code segments. */
export function splitFenced(md: string): FencedSegment[] {
  const segments: FencedSegment[] = [];
  let last = 0;
  FENCE.lastIndex = 0;
  let m = FENCE.exec(md);
  while (m !== null) {
    if (m.index > last) {
      // Trim the newline(s) that merely separate text from the fence — the
      // serializer re-adds them, so keeping both would accumulate blank lines.
      const text = md.slice(last, m.index).replace(/\n+$/, '');
      if (text) segments.push({ type: 'text', lang: '', content: text });
    }
    segments.push({ type: 'code', lang: m[1] ?? '', content: m[2].replace(/\n$/, '') });
    last = m.index + m[0].length;
    m = FENCE.exec(md);
  }
  if (last < md.length) {
    const text = md.slice(last).replace(/^\n+/, '');
    if (text) segments.push({ type: 'text', lang: '', content: text });
  }
  return segments;
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
 * Seconds to start playback from, read from a YouTube URL's `t`/`start` param.
 * Accepts plain seconds (`t=90`) or `1h2m3s` form. Returns 0 when absent.
 */
export function parseYouTubeStart(url?: string | null): number {
  if (!url) return 0;
  const m = url.match(/[?&#](?:t|start)=([0-9hms]+)/i);
  if (!m) return 0;
  const v = m[1];
  if (/^\d+$/.test(v)) return Number.parseInt(v, 10);
  const h = v.match(/(\d+)h/);
  const min = v.match(/(\d+)m/);
  const sec = v.match(/(\d+)s/);
  return (h ? +h[1] * 3600 : 0) + (min ? +min[1] * 60 : 0) + (sec ? +sec[1] : 0);
}

export function hasText(value?: string | null): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Display label + icon for each question type (used in the lobby intro, etc). */
export const QUESTION_TYPE_META: Record<QuestionType, { label: string; icon: LucideIcon }> = {
  multiple_choice: { label: 'Single Choice', icon: Target },
  multi_select: { label: 'Multiple Answers', icon: ListChecks },
  true_false: { label: 'True / False', icon: ToggleLeft },
  open_text: { label: 'Open Text', icon: PenLine },
  closest_to: { label: 'Closest Number', icon: Gauge },
  fill_blank: { label: 'Fill the Blank', icon: SquareDashed },
  ordering: { label: 'Put in Order', icon: ArrowUpDown },
  geo: { label: 'Locate on Map', icon: MapPin },
};

/** Format a duration in seconds as `45s`, `2m`, or `2m 30s`. */
export function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

/** Split a comma-separated tag input into a clean list. */
export function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Deterministic hue (0–359) for a tag — same text always yields the same color. */
export function tagHue(tag: string): number {
  let h = 0;
  const key = tag.toLowerCase();
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return ((h % 360) + 360) % 360;
}

/** Inline style (bg/text/border) for a colored tag chip on a dark surface. */
export function tagChipStyle(tag: string): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const hue = tagHue(tag);
  return {
    backgroundColor: `hsl(${hue} 70% 50% / 0.18)`,
    color: `hsl(${hue} 85% 78%)`,
    borderColor: `hsl(${hue} 70% 55% / 0.45)`,
  };
}

/** Count the `___` blank markers (3+ underscores) in fill-in-the-blank text. */
export function countBlanks(text: string): number {
  return (text.match(/_{3,}/g) ?? []).length;
}

export function validateClosestToQuestion(q: ImportQuestion, index: number): string | null {
  const min = q.rangeMin;
  const max = q.rangeMax;
  if (min === undefined || max === undefined) {
    return `Question ${index + 1} needs a range (min and max)`;
  }
  if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
    return `Question ${index + 1} needs a valid range (min must be less than max)`;
  }
  const target = Number.parseInt(q.correctAnswer ?? '', 10);
  if (!hasText(q.correctAnswer) || Number.isNaN(target)) {
    return `Question ${index + 1} needs a numeric correct answer`;
  }
  if (target < min || target > max) {
    return `Question ${index + 1} correct answer must be within the range`;
  }
  return null;
}

export function validateQuizQuestions(questions: ImportQuestion[]): string | null {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.text.trim()) {
      return `Question ${i + 1} has no text`;
    }
    const type = q.questionType ?? 'multiple_choice';
    if (type === 'open_text' && !q.correctAnswer?.trim()) {
      return `Question ${i + 1} needs a correct answer`;
    }
    if (
      (type === 'multiple_choice' || type === 'multi_select') &&
      q.options.some((o) => !o.trim())
    ) {
      return `Question ${i + 1} has empty options`;
    }
    if (type === 'multi_select' && (!q.correctIndices || q.correctIndices.length < 2)) {
      return `Question ${i + 1} needs at least 2 correct answers selected`;
    }
    if (type === 'closest_to') {
      const err = validateClosestToQuestion(q, i);
      if (err) return err;
    }
    if (type === 'fill_blank') {
      const marks = countBlanks(q.text);
      if (marks === 0) {
        return `Question ${i + 1} needs at least one blank — write ___ (3+ underscores) in the text`;
      }
      const blanks = q.blanks ?? [];
      if (blanks.length !== marks) {
        return `Question ${i + 1}: ${marks} blank(s) in the text but ${blanks.length} answer set(s)`;
      }
      if (blanks.some((accepted) => accepted.filter((a) => a.trim()).length === 0)) {
        return `Question ${i + 1}: every blank needs at least one accepted answer`;
      }
    }
    if (type === 'ordering') {
      if (q.options.length < 2) {
        return `Question ${i + 1} needs at least 2 items to order`;
      }
      if (q.options.some((o) => !o.trim())) {
        return `Question ${i + 1} has empty items`;
      }
    }
    if (type === 'geo') {
      if (!q.geo || typeof q.geo.lat !== 'number' || typeof q.geo.lng !== 'number') {
        return `Question ${i + 1}: click the correct location on the map`;
      }
    }
  }
  return null;
}

export function validateQuizPayload(title: string, questions: ImportQuestion[]): string | null {
  if (!title.trim()) return 'Title is required';
  if (questions.length === 0) return 'At least one question is required';
  return validateQuizQuestions(questions);
}

export function mapDbQuestionToImport(q: {
  text: string;
  options: string[];
  correct_index: number;
  correct_indices?: number[] | null;
  base_score: number;
  time_sec: number;
  image_url?: string | null;
  explanation?: string | null;
  range_min?: number | null;
  range_max?: number | null;
  question_type?: QuestionType;
  correct_answer?: string | null;
  media_url?: string | null;
  media_type?: 'audio' | 'video' | null;
  blanks?: string[][] | null;
  geo?: GeoPoint | null;
  tags?: string[] | null;
}): QuestionWithKey {
  return withKey({
    text: q.text,
    options: q.options,
    correctIndex: q.correct_index,
    correctIndices: q.correct_indices ?? undefined,
    baseScore: q.base_score,
    timeSec: q.time_sec,
    imageUrl: q.image_url ?? undefined,
    explanation: q.explanation ?? undefined,
    rangeMin: q.range_min ?? undefined,
    rangeMax: q.range_max ?? undefined,
    questionType: q.question_type ?? 'multiple_choice',
    correctAnswer: q.correct_answer ?? undefined,
    mediaUrl: q.media_url ?? undefined,
    mediaType: q.media_type ?? undefined,
    blanks: q.blanks ?? undefined,
    geo: q.geo ?? undefined,
    tags: q.tags ?? undefined,
  });
}

export type { ImportPayload };
