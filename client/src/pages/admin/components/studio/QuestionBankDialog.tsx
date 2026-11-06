import { Dices } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import type { GeoPoint, ImportQuestion } from '@/types';

interface BankSource {
  source: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
}

interface BankMeta {
  sources: BankSource[];
  total: number;
  categories: Array<{ name: string; count: number }>;
}

interface BankQuestion {
  id: number;
  category: string;
  difficulty: string;
  type: string;
  text: string;
  correct?: string;
  incorrect?: string[];
  textFr?: string;
  geo?: GeoPoint;
}

interface Props {
  /** The quiz's language: map questions have French text too. */
  language: string;
  onAdd: (questions: ImportQuestion[]) => void;
  onClose: () => void;
}

const ALL = 'all';
const RANDOM_COUNT = 10;
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const TYPES = [
  { value: 'multiple', label: 'Multiple choice' },
  { value: 'boolean', label: 'True / False' },
  { value: 'geo', label: 'Map' },
];
const SEARCH_DELAY_MS = 250;

/** "Entertainment: Film" reads better as "Film" in filters and tags. */
function categoryLabel(name: string): string {
  return name.replace(/^(Entertainment|Science): /, '');
}

function questionText(q: BankQuestion, language: string): string {
  return language.startsWith('fr') && q.textFr ? q.textFr : q.text;
}

function toQuizQuestion(q: BankQuestion, language: string): ImportQuestion {
  const shared = {
    text: questionText(q, language),
    baseScore: 500,
    timeSec: 20,
    tags: [categoryLabel(q.category), q.difficulty],
  };
  if (q.type === 'geo') {
    return { ...shared, options: [], correctIndex: 0, geo: q.geo, questionType: 'geo' };
  }
  const correct = q.correct ?? '';
  const incorrect = q.incorrect ?? [];
  if (q.type === 'boolean') {
    return {
      ...shared,
      options: ['True', 'False'],
      correctIndex: correct === 'True' ? 0 : 1,
      questionType: 'true_false',
    };
  }
  // The correct answer must not always land in the same slot of the editor.
  const correctIndex = Math.floor(Math.random() * (incorrect.length + 1));
  const options = [...incorrect];
  options.splice(correctIndex, 0, correct);
  return { ...shared, options, correctIndex, questionType: 'multiple_choice' };
}

export function QuestionBankDialog({ language, onAdd, onClose }: Props) {
  const api = useAuthFetch();
  const [meta, setMeta] = useState<BankMeta | null>(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<BankQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Map<number, BankQuestion>>(new Map());

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (category !== ALL) params.set('category', category);
    if (difficulty !== ALL) params.set('difficulty', difficulty);
    if (type !== ALL) params.set('type', type);
    if (search.trim()) params.set('search', search.trim());
    return params;
  }, [category, difficulty, type, search]);

  useEffect(() => {
    api.get<BankMeta>('/api/admin/question-bank/meta').then(({ ok, data }) => {
      if (ok) setMeta(data);
      else setError('The question bank is not available.');
    });
  }, [api]);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const { ok, data } = await api.get<{ total: number; questions: BankQuestion[] }>(
        `/api/admin/question-bank?${baseQuery}`,
      );
      if (stale) return;
      setLoading(false);
      if (!ok) return;
      setResults(data.questions);
      setTotal(data.total);
    }, SEARCH_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [api, baseQuery]);

  function toggle(q: BankQuestion) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (!next.delete(q.id)) next.set(q.id, q);
      return next;
    });
  }

  async function pickRandom() {
    const params = new URLSearchParams(baseQuery);
    params.set('random', '1');
    params.set('limit', String(RANDOM_COUNT));
    const { ok, data } = await api.get<{ questions: BankQuestion[] }>(
      `/api/admin/question-bank?${params}`,
    );
    if (!ok) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const q of data.questions) next.set(q.id, q);
      return next;
    });
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Question bank</DialogTitle>
          <DialogDescription>
            {meta
              ? `${meta.total.toLocaleString()} ready-made questions in English. Map questions also come in French and follow the quiz's language.`
              : ' '}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions…"
                aria-label="Search questions"
                className="min-w-40 flex-1"
              />
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-52" aria-label="Topic">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All topics</SelectItem>
                  {meta?.categories.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {categoryLabel(c.name)} ({c.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-36 capitalize" aria-label="Difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All levels</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-40" aria-label="Question type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All types</SelectItem>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={pickRandom} disabled={total === 0}>
                <Dices className="size-4" /> Pick {RANDOM_COUNT} at random
              </Button>
            </div>

            <div className="min-h-48 flex-1 divide-y divide-border overflow-y-auto rounded-sm border border-border bg-[var(--surface2)]">
              {results.map((q) => (
                <label
                  key={q.id}
                  htmlFor={`bank-${q.id}`}
                  className="flex cursor-pointer items-start gap-3 p-3"
                >
                  <Checkbox
                    id={`bank-${q.id}`}
                    className="mt-0.5"
                    checked={selected.has(q.id)}
                    onCheckedChange={() => toggle(q)}
                  />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="block font-medium">{questionText(q, language)}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {categoryLabel(q.category)} · {q.difficulty}
                      {q.correct ? ` · Answer: ${q.correct}` : ' · Map'}
                    </span>
                  </span>
                </label>
              ))}
              {!loading && results.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No questions match these filters.
                </p>
              )}
            </div>
            {results.length < total && (
              <p className="text-xs text-muted-foreground">
                Showing the first {results.length} of {total.toLocaleString()}. Filter or search to
                narrow them down.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
              {meta && (
                <p className="text-xs text-muted-foreground">
                  Questions from{' '}
                  {meta.sources.map((s, i) => (
                    <span key={s.source}>
                      {i > 0 && ' and '}
                      <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                        {s.source}
                      </a>{' '}
                      (
                      <a href={s.licenseUrl} target="_blank" rel="noreferrer" className="underline">
                        {s.license}
                      </a>
                      )
                    </span>
                  ))}
                  .
                </p>
              )}
              <Button
                type="button"
                disabled={selected.size === 0}
                onClick={() =>
                  onAdd([...selected.values()].map((q) => toQuizQuestion(q, language)))
                }
              >
                Add {selected.size} question{selected.size === 1 ? '' : 's'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
