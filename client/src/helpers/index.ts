import type { ImportQuestion } from '@/types';
export type QuestionWithKey = ImportQuestion & { _key: string };

export function withKey(q: ImportQuestion): QuestionWithKey {
  return { ...q, _key: crypto.randomUUID() };
}
