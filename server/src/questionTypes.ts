import type { DbQuestion, QuestionType } from './types';

/** Non-interactive question variants: shown on screen until the host moves on. */
const SLIDE_TYPES: readonly QuestionType[] = ['title_slide', 'standings_slide'];

/** SQL list form of SLIDE_TYPES, for excluding slides from counts and history. */
export const SLIDE_TYPES_SQL = "('title_slide', 'standings_slide')";

export function isSlideType(type: QuestionType | undefined): boolean {
  return type !== undefined && SLIDE_TYPES.includes(type);
}

/** Questions players actually answer (slides don't count towards "Question 3 of 10"). */
export function playableCount(questions: DbQuestion[]): number {
  return questions.filter((q) => !isSlideType(q.question_type)).length;
}

/** Position of the row at `index` among playable questions (slides ahead of it don't count). */
export function playableIndex(questions: DbQuestion[], index: number): number {
  return playableCount(questions.slice(0, index));
}
