import { countBlanks, isSlideType } from '@/helpers';
import { arrayMove } from '@/hooks/usePointerReorder';
import type { ImportQuestion, QuestionType } from '@/types';

export type ChangeFn = (field: keyof ImportQuestion, value: unknown) => void;

export function blankQuestion(): ImportQuestion {
  return {
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    baseScore: 500,
    timeSec: 20,
    questionType: 'multiple_choice',
  };
}

/** True for a starter slide nobody has typed into yet. */
export function isBlankQuestion(q: ImportQuestion): boolean {
  return !q.text.trim() && (q.options ?? []).every((o) => !o.trim());
}

/**
 * Repair per-type invariants on a question no matter where it came from
 * (blank slide, restored draft, JSON import, DB hydrate). Keeping this here —
 * rather than in mount-scoped component effects — means slides that are never
 * activated in the canvas still reach save with valid defaults.
 */
export function normalizeQuestion(q: ImportQuestion): ImportQuestion {
  const type = q.questionType ?? 'multiple_choice';
  let next = q;
  if (isSlideType(type) && (!next.options || next.correctIndex === undefined)) {
    next = { ...next, options: next.options ?? [], correctIndex: next.correctIndex ?? 0 };
  }
  if (type === 'closest_to') {
    if (next.rangeMin === undefined) next = { ...next, rangeMin: 1 };
    if (next.rangeMax === undefined) next = { ...next, rangeMax: 100 };
  }
  if (type === 'fill_blank') {
    const count = countBlanks(next.text);
    const blanks = next.blanks ?? [];
    if (count > 0 && blanks.length !== count) {
      next = {
        ...next,
        blanks: Array.from({ length: count }, (_, i) => blanks[i] ?? []),
      };
    }
  }
  if (type === 'matching') {
    const opts = next.options ?? [];
    const m = next.matches ?? [];
    if (m.length !== opts.length) {
      next = { ...next, matches: Array.from({ length: opts.length }, (_, i) => m[i] ?? '') };
    }
  }
  return next;
}

/**
 * Drop empty trailing answer tiles before validation. The canvas labels tiles
 * 3+ "(optional)", so a default 4-tile question filled with only two answers
 * must save cleanly instead of tripping the empty-options validation error.
 * Only trailing blanks are removed, and never ones a correct index points at.
 */
export function stripTrailingEmptyOptions(q: ImportQuestion): ImportQuestion {
  const type = q.questionType ?? 'multiple_choice';
  if (type !== 'multiple_choice' && type !== 'multi_select') return q;
  const opts = [...(q.options ?? [])];
  const referenced = (i: number) =>
    type === 'multi_select' ? (q.correctIndices ?? []).includes(i) : q.correctIndex === i;
  while (opts.length > 2 && !opts[opts.length - 1].trim() && !referenced(opts.length - 1)) {
    opts.pop();
  }
  return opts.length === (q.options ?? []).length ? q : { ...q, options: opts };
}

/**
 * Per-question mutation helpers shared by the studio canvas and properties
 * panel. Ported from the original stacked QuestionEditor so both the Kahoot
 * tiles and the property controls stay in sync.
 */
export function questionOps(q: ImportQuestion, onChange: ChangeFn) {
  const type = q.questionType ?? 'multiple_choice';

  function setType(t: QuestionType) {
    // Re-clicking the active type must be a no-op — the multi_select branch
    // below would otherwise wipe the author's correctIndices back to [0].
    if (t === type) return;
    onChange('questionType', t);
    if (isSlideType(t)) {
      onChange('options', []);
      onChange('correctIndex', 0);
      onChange('correctIndices', undefined);
      onChange('mediaType', undefined);
      onChange('mediaUrl', undefined);
      onChange('tags', undefined);
      if (t === 'standings_slide') {
        onChange('imageUrl', undefined);
        onChange('explanation', undefined);
        if (!q.text.trim()) onChange('text', 'Current standings');
      }
    } else if (t === 'true_false') {
      onChange('options', ['True', 'False']);
      onChange('correctIndex', 0);
      onChange('correctIndices', undefined);
    } else if (t === 'open_text') {
      onChange('options', []);
      onChange('correctIndices', undefined);
    } else if (t === 'closest_to') {
      onChange('options', []);
      onChange('correctIndices', undefined);
      if (q.rangeMin === undefined) onChange('rangeMin', 1);
      if (q.rangeMax === undefined) onChange('rangeMax', 100);
    } else if (t === 'multi_select') {
      if ((q.options ?? []).length < 2) onChange('options', ['', '', '', '']);
      onChange('correctIndices', [0]);
    } else if (t === 'fill_blank') {
      onChange('options', []);
      onChange('correctIndices', undefined);
      if (!q.blanks || q.blanks.length === 0) onChange('blanks', [['']]);
    } else if (t === 'ordering') {
      if ((q.options ?? []).length < 2) onChange('options', ['', '', '']);
      onChange('correctIndices', undefined);
    } else if (t === 'geo') {
      onChange('options', []);
      onChange('correctIndices', undefined);
      onChange('mediaType', undefined);
      onChange('mediaUrl', undefined);
    } else if (t === 'matching') {
      if ((q.options ?? []).length < 2) {
        onChange('options', ['', '']);
        onChange('matches', ['', '']);
      } else if (!q.matches || q.matches.length !== q.options.length) {
        onChange(
          'matches',
          Array.from({ length: q.options.length }, () => ''),
        );
      }
      onChange('correctIndices', undefined);
    } else {
      if ((q.options ?? []).length < 2) onChange('options', ['', '', '', '']);
      onChange('correctIndices', undefined);
    }
  }

  function updateOption(oi: number, value: string) {
    const opts = [...(q.options ?? [])];
    opts[oi] = value;
    onChange('options', opts);
  }

  function addOption() {
    onChange('options', [...(q.options ?? []), '']);
  }

  function removeOption(oi: number) {
    const opts = (q.options ?? []).filter((_, i) => i !== oi);
    if (type === 'multi_select') {
      const newIndices = (q.correctIndices ?? [])
        .filter((i) => i !== oi)
        .map((i) => (i > oi ? i - 1 : i));
      onChange('correctIndices', newIndices);
    } else {
      const newCorrect =
        q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex;
      onChange('correctIndex', Math.min(newCorrect, opts.length - 1));
    }
    onChange('options', opts);
  }

  function toggleCorrectIndex(oi: number) {
    const current = q.correctIndices ?? [];
    if (current.includes(oi)) {
      onChange(
        'correctIndices',
        current.filter((i) => i !== oi),
      );
    } else {
      onChange('correctIndices', [...current, oi]);
    }
  }

  function reorderOptions(from: number, to: number) {
    onChange('options', arrayMove(q.options ?? [], from, to));
  }

  // Matching helpers — options[i] is the left item, matches[i] its correct
  // right-hand match; the two arrays are always kept the same length.
  function updateMatchLeft(i: number, value: string) {
    const opts = [...(q.options ?? [])];
    opts[i] = value;
    onChange('options', opts);
  }

  function updateMatchRight(i: number, value: string) {
    const m = [...(q.matches ?? [])];
    m[i] = value;
    onChange('matches', m);
  }

  function addMatchPair() {
    if ((q.options ?? []).length >= 6) return;
    onChange('options', [...(q.options ?? []), '']);
    onChange('matches', [...(q.matches ?? []), '']);
  }

  function removeMatchPair(i: number) {
    if ((q.options ?? []).length <= 2) return;
    onChange(
      'options',
      (q.options ?? []).filter((_, idx) => idx !== i),
    );
    onChange(
      'matches',
      (q.matches ?? []).filter((_, idx) => idx !== i),
    );
  }

  function setBlankAccepted(bi: number, csv: string) {
    const count = countBlanks(q.text);
    const next: string[][] = Array.from({ length: count }, (_, i) =>
      i === bi ? csv.split(',').map((s) => s.trim()) : (q.blanks?.[i] ?? []),
    );
    onChange('blanks', next);
  }

  // Media helpers ─────────────────────────────────────────────────────────────
  function setImage(url: string | undefined) {
    onChange('mediaUrl', undefined);
    onChange('mediaType', undefined);
    onChange('imageUrl', url || undefined);
  }

  function setYouTube(kind: 'audio' | 'video', url: string | undefined) {
    onChange('imageUrl', undefined);
    onChange('mediaType', url ? kind : undefined);
    onChange('mediaUrl', url || undefined);
  }

  function clearMedia() {
    onChange('imageUrl', undefined);
    onChange('mediaUrl', undefined);
    onChange('mediaType', undefined);
  }

  return {
    type,
    setType,
    updateOption,
    addOption,
    removeOption,
    toggleCorrectIndex,
    reorderOptions,
    updateMatchLeft,
    updateMatchRight,
    addMatchPair,
    removeMatchPair,
    setBlankAccepted,
    setImage,
    setYouTube,
    clearMedia,
  };
}
