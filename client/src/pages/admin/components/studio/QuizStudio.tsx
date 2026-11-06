import {
  Check,
  ClipboardList,
  Copy,
  Eye,
  Library,
  PencilLine,
  Search,
  SlidersHorizontal,
  Zap,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { AppAlert } from '@/components/AppAlert';
import { Input, Textarea } from '@/components/Input';
import { MediaPicker } from '@/components/MediaPicker';
import { QuizPreviewModal } from '@/components/QuizPreviewModal';
import { Button } from '@/components/ui/button';
import { copyText, type QuestionWithKey, validateQuizPayload, withKey } from '@/helpers';
import { COMMON_LOCALES, DEFAULT_LOCALE, localeName } from '@/helpers/locale';
import { cn } from '@/lib/utils';
import type { ImportPayload, ImportQuestion } from '@/types';
import { PropertiesPanel } from './PropertiesPanel';
import { QuestionBankDialog } from './QuestionBankDialog';
import { QuestionCanvas } from './QuestionCanvas';
import {
  blankQuestion,
  isBlankQuestion,
  normalizeQuestion,
  questionOps,
  stripTrailingEmptyOptions,
} from './questionOps';
import { SlideRail } from './SlideRail';

// Autosaved new-quiz draft, so a reload mid-creation doesn't lose work.
const DRAFT_KEY = 'quizz:create-draft-v1';

interface Draft {
  title: string;
  description: string;
  coverImage: string;
  language?: string;
  questions: QuestionWithKey[];
}

function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    if (!d || !Array.isArray(d.questions) || d.questions.length === 0) return null;
    // Older drafts (or hand-edited storage) may lack the React list keys.
    d.questions = d.questions.map((q) => (q?._key ? q : withKey(q)));
    return d;
  } catch {
    return null;
  }
}

/**
 * Drop the autosaved create draft. Exported so the JSON-import path in
 * CreateQuiz (where this component is unmounted) can also clear it on success.
 */
export function clearCreateDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore storage errors */
  }
}

/** Write a create draft — used when JSON import hydrates the studio. */
export function saveCreateDraft(draft: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore storage errors (quota / private mode) */
  }
}

/** True while the studio state is still the untouched blank quiz. */
function isPristine(
  title: string,
  description: string,
  coverImage: string,
  questions: QuestionWithKey[],
): boolean {
  if (title !== '' || description !== '' || coverImage !== '') return false;
  if (questions.length !== 1) return false;
  const { _key, ...q } = questions[0];
  return JSON.stringify(q) === JSON.stringify(blankQuestion());
}

interface Props {
  mode: 'create' | 'edit';
  initialTitle?: string;
  initialDescription?: string;
  initialCoverImage?: string;
  initialLanguage?: string;
  initialQuestions?: QuestionWithKey[];
  saving: boolean;
  error: string;
  success: string;
  onSave: (payload: ImportPayload) => void;
  onCancel: () => void;
  onValidationError: (msg: string) => void;
  headerExtra?: ReactNode;
}

export function QuizStudio({
  mode,
  initialTitle = '',
  initialDescription = '',
  initialCoverImage = '',
  initialLanguage = DEFAULT_LOCALE,
  initialQuestions,
  saving,
  error,
  success,
  onSave,
  onCancel,
  onValidationError,
  headerExtra,
}: Props) {
  // Only the create flow restores an autosaved draft; edit hydrates from the DB.
  const [draft, setDraft] = useState<Draft | null>(() => (mode === 'create' ? readDraft() : null));
  const [title, setTitle] = useState(draft?.title ?? initialTitle);
  const [description, setDescription] = useState(draft?.description ?? initialDescription);
  const [coverImage, setCoverImage] = useState(draft?.coverImage ?? initialCoverImage);
  const [language, setLanguage] = useState(draft?.language ?? initialLanguage);
  const [questions, setQuestions] = useState<QuestionWithKey[]>(() =>
    (
      draft?.questions ??
      (initialQuestions && initialQuestions.length > 0
        ? initialQuestions
        : [withKey(blankQuestion())])
    ).map((q) => ({ ...normalizeQuestion(q), _key: q._key })),
  );
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<'props' | 'quiz'>('props');
  const [previewing, setPreviewing] = useState(false);
  const [coverPicker, setCoverPicker] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  const activeQ = questions[Math.min(active, questions.length - 1)];

  // Autosave the create draft (debounced) so a reload restores it. A pristine
  // blank quiz clears the draft instead of writing one — otherwise every visit
  // would show "Draft restored" and "Discard draft" would be undone instantly.
  useEffect(() => {
    if (mode !== 'create') return;
    const timer = setTimeout(() => {
      try {
        if (isPristine(title, description, coverImage, questions)) {
          clearCreateDraft();
        } else {
          localStorage.setItem(
            DRAFT_KEY,
            JSON.stringify({ title, description, coverImage, language, questions }),
          );
        }
      } catch {
        /* ignore storage errors (quota / private mode) */
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, title, description, coverImage, language, questions]);

  // Once the quiz is created, drop the draft so it doesn't reappear next time.
  useEffect(() => {
    if (mode === 'create' && success) clearCreateDraft();
  }, [mode, success]);

  function updateActive(field: keyof ImportQuestion, value: unknown) {
    setQuestions((prev) => prev.map((q, i) => (i === active ? { ...q, [field]: value } : q)));
  }

  function addSlide() {
    // setActive stays outside the updater — updaters must be pure (StrictMode
    // double-invokes them), so use the current length for the new index.
    setQuestions((prev) => [...prev, withKey(blankQuestion())]);
    setActive(questions.length);
  }

  function addFromBank(picked: ImportQuestion[]) {
    // An untouched starter slide would otherwise fail validation on save.
    const untouched = questions.length === 1 && isBlankQuestion(questions[0]);
    setQuestions((prev) => [...(untouched ? [] : prev), ...picked.map(withKey)]);
    setActive(untouched ? 0 : questions.length);
    setBankOpen(false);
  }

  function removeSlide(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
    setActive((a) => Math.max(0, Math.min(a, questions.length - 2)));
  }

  function handleSave() {
    const prepared = questions.map((q) => ({
      ...stripTrailingEmptyOptions(normalizeQuestion(q)),
      _key: q._key,
    }));
    const err = validateQuizPayload(title, prepared);
    if (err) {
      onValidationError(err);
      return;
    }
    onSave({
      title,
      description,
      coverImage: coverImage || undefined,
      language,
      questions: prepared,
    });
  }

  function buildExportPayload(): ImportPayload {
    return {
      title,
      description: description || undefined,
      coverImage: coverImage || undefined,
      language,
      questions: questions.map((q) => {
        const { _key, ...base } = q;
        return stripTrailingEmptyOptions(normalizeQuestion(base));
      }),
    };
  }

  async function handleExportJson() {
    if (!(await copyText(JSON.stringify(buildExportPayload(), null, 2)))) return;
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 1500);
  }

  function discardDraft() {
    clearCreateDraft();
    setDraft(null);
    setTitle('');
    setDescription('');
    setCoverImage('');
    setLanguage(DEFAULT_LOCALE);
    setQuestions([withKey(blankQuestion())]);
    setActive(0);
  }

  const ops = questionOps(activeQ, updateActive);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="z-20 flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2 backdrop-blur sm:gap-3 sm:px-4">
        <span className="flex shrink-0 items-center gap-1.5 text-lg font-extrabold text-foreground">
          <Zap className="size-5 fill-brand text-brand" />
          <span className="hidden sm:inline">Quizz</span>
        </span>
        <span className="hidden h-5 w-px bg-border sm:block" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter quiz title…"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-[15px] font-bold text-foreground outline-none focus:border-border focus:bg-muted sm:max-w-xs sm:flex-none sm:px-3 lg:max-w-sm lg:w-72"
        />
        {mode === 'create' && draft && (
          <span className="hidden items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground sm:flex">
            <PencilLine className="size-3" /> Draft restored
          </span>
        )}
        <div className="hidden flex-1 lg:block" />
        <div className="flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
          {mode === 'create' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={discardDraft}
              title="Clear this draft and start blank"
              className="hidden sm:inline-flex"
            >
              Discard draft
            </Button>
          )}
          {headerExtra}
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Exit
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setBankOpen(true)}>
            <Library className="size-4" />
            <span className="hidden sm:inline">Question bank</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewing(true)}>
            <Eye className="size-4" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportJson}
            title="Copy quiz as import-ready JSON"
          >
            {copiedJson ? (
              <>
                <Check className="size-4" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-4" />
                <span className="hidden sm:inline">Export JSON</span>
              </>
            )}
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              '…'
            ) : (
              <>
                <Check className="size-4" />
                <span className="hidden sm:inline">
                  {mode === 'create' ? 'Create quiz' : 'Save'}
                </span>
                <span className="sm:hidden">{mode === 'create' ? 'Create' : 'Save'}</span>
              </>
            )}
          </Button>
        </div>
      </header>

      {(error || success) && (
        <div className="shrink-0 px-4 py-2">
          {error && <AppAlert variant="error">{error}</AppAlert>}
          {success && <AppAlert variant="success">{success}</AppAlert>}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <SlideRail
          layout="horizontal"
          className="lg:hidden"
          questions={questions}
          active={active}
          onSelect={setActive}
          onAdd={addSlide}
          onRemove={removeSlide}
        />

        <SlideRail
          className="hidden lg:flex"
          questions={questions}
          active={active}
          onSelect={setActive}
          onAdd={addSlide}
          onRemove={removeSlide}
        />

        {/* Center canvas */}
        <main
          className="studio-scroll min-h-0 min-w-0 flex-1 overflow-y-auto"
          style={{
            background:
              'radial-gradient(800px 420px at 50% -10%, color-mix(in srgb, var(--primary) 10%, transparent), transparent 60%)',
          }}
        >
          {activeQ && <QuestionCanvas q={activeQ} ops={ops} onChange={updateActive} />}
        </main>

        {/* Right panel — full width strip on mobile, sidebar on desktop */}
        <aside className="studio-scroll flex max-h-[42vh] w-full shrink-0 flex-col overflow-y-auto border-t border-border bg-muted/20 lg:max-h-none lg:w-[345px] lg:border-l lg:border-t-0">
          <div className="flex gap-1 p-3">
            <button
              type="button"
              onClick={() => setTab('props')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[0.8rem] font-semibold transition-colors',
                tab === 'props'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <SlidersHorizontal className="size-3.5" /> Properties
            </button>
            <button
              type="button"
              onClick={() => setTab('quiz')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[0.8rem] font-semibold transition-colors',
                tab === 'quiz'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ClipboardList className="size-3.5" /> Quiz
            </button>
          </div>

          {tab === 'props' ? (
            activeQ && <PropertiesPanel q={activeQ} ops={ops} onChange={updateActive} />
          ) : (
            <div className="flex flex-col gap-4 p-4">
              <div>
                <Input
                  noMargin
                  label="Language"
                  list="quiz-language-suggestions"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value || DEFAULT_LOCALE)}
                  placeholder={DEFAULT_LOCALE}
                  hint={`The language this quiz is written in — players who don't pick a translation see "${localeName(language)}".`}
                />
                <datalist id="quiz-language-suggestions">
                  {COMMON_LOCALES.map((code) => (
                    <option key={code} value={code}>
                      {localeName(code)}
                    </option>
                  ))}
                </datalist>
              </div>
              <Textarea
                noMargin
                label="Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Shown to players in the lobby"
              />
              <div>
                <Input
                  noMargin
                  label="Cover image URL"
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://…"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => setCoverPicker(true)}
                >
                  <Search className="size-3.5" /> Search image
                </Button>
                {coverImage.trim() && (
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="mt-2 max-h-[140px] w-full rounded-lg object-cover"
                  />
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {bankOpen && (
        <QuestionBankDialog
          language={language}
          onAdd={addFromBank}
          onClose={() => setBankOpen(false)}
        />
      )}

      {previewing && (
        <QuizPreviewModal
          title={title}
          questions={questions}
          onClose={() => setPreviewing(false)}
        />
      )}
      <MediaPicker
        open={coverPicker}
        onClose={() => setCoverPicker(false)}
        allow={['image']}
        onPick={(m) => {
          if (m.kind === 'image') setCoverImage(m.url);
        }}
      />
    </div>
  );
}
