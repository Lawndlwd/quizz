import { QUESTION_TYPE_META } from '@/helpers';
import type { QuestionType } from '@/types';

// Re-export the shared per-type label/icon map (single source of truth with
// the lobby intro card) instead of maintaining a diverging studio copy.
export const TYPE_META = QUESTION_TYPE_META;

export const ALL_TYPES = Object.keys(QUESTION_TYPE_META) as QuestionType[];

/** Short tag shown on the slide-rail thumbnail. */
export const TYPE_SHORT: Record<QuestionType, string> = {
  multiple_choice: 'Quiz',
  multi_select: 'Multi',
  true_false: 'T/F',
  open_text: 'Text',
  closest_to: 'Slider',
  fill_blank: 'Blank',
  ordering: 'Order',
  geo: 'Map',
};
