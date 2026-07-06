import { ArrowLeft, Braces, Check, Eye, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import { Textarea } from '@/components/Input';
import { MainContent, Page, Subtitle } from '@/components/layout';
import { QuizPreviewModal } from '@/components/QuizPreviewModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  importPayloadToStudioDraft,
  parseQuizImportJson,
  QUIZ_IMPORT_AI_PROMPT,
  QUIZ_IMPORT_EXAMPLE_JSON,
  QUIZ_IMPORT_JSON_SHORT,
} from '@/helpers/quizImportSchema';
import CreatorNav from '../../components/CreatorNav';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useCreatorBase } from '../../hooks/useCreatorBase';
import type { ImportPayload, ImportQuestion } from '../../types';
import { cn } from '@/lib/utils';

import { clearCreateDraft, QuizStudio, saveCreateDraft } from './components/studio/QuizStudio';

const COPY_TONE = {
  example: {
    label: 'Copy example',
    icon: Braces,
    className:
      'border-violet-500/35 bg-violet-600 text-white hover:bg-violet-500 focus-visible:ring-violet-500/40',
  },
  prompt: {
    label: 'Copy prompt',
    icon: Sparkles,
    className:
      'border-cyan-500/35 bg-cyan-600 text-white hover:bg-cyan-500 focus-visible:ring-cyan-500/40',
  },
} as const;

/** Copies preset text to the clipboard with brief copied feedback. */
function CopyTextButton({
  text,
  tone,
  className,
  inSummary,
}: {
  text: string;
  tone: keyof typeof COPY_TONE;
  className?: string;
  inSummary?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { label, icon: Icon, className: toneClassName } = COPY_TONE[tone];
  return (
    <Button
      type="button"
      size="sm"
      className={cn(toneClassName, className)}
      onClick={(e) => {
        if (inSummary) {
          e.preventDefault();
          e.stopPropagation();
        }
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? (
        <>
          <Check className="size-3.5" /> Copied
        </>
      ) : (
        <>
          <Icon className="size-3.5" /> {label}
        </>
      )}
    </Button>
  );
}

export default function CreateQuiz() {
  const api = useAuthFetch();
  const navigate = useNavigate();
  const basePath = useCreatorBase();
  const [mode, setMode] = useState<'studio' | 'json'>('studio');
  const [studioKey, setStudioKey] = useState(0);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ title: string; questions: ImportQuestion[] } | null>(
    null,
  );

  const saveLabel = saving ? (
    'Saving…'
  ) : (
    <>
      <Check className="size-4" /> Create Quiz
    </>
  );

  async function saveQuiz(payload: ImportPayload) {
    setSaving(true);
    setJsonError('');
    setSuccess('');
    const { ok, data } = await api.post<{ id: number; error?: string }>(
      '/api/admin/quizzes',
      payload,
    );
    setSaving(false);
    if (ok) {
      // Drop the studio autosave here, not only in QuizStudio's success effect —
      // the JSON-import path saves with QuizStudio unmounted, and the stale
      // draft would otherwise be restored (and re-saveable) on the next visit.
      clearCreateDraft();
      setSuccess(`Quiz created! ID: ${data.id}`);
      setTimeout(() => navigate(basePath), 1000);
    } else {
      setJsonError(data.error ?? 'Failed to save quiz');
    }
  }

  async function handleJsonSubmit() {
    const parsed = parseQuizImportJson(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    await saveQuiz(parsed.payload);
  }

  function applyJsonToStudio(): boolean {
    setJsonError('');
    const parsed = parseQuizImportJson(jsonText);
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return false;
    }
    saveCreateDraft(importPayloadToStudioDraft(parsed.payload));
    setStudioKey((k) => k + 1);
    setMode('studio');
    return true;
  }

  function backToStudio() {
    if (jsonText.trim()) {
      applyJsonToStudio();
      return;
    }
    setJsonError('');
    setMode('studio');
  }

  function openJsonPreview() {
    setJsonError('');
    const parsed = parseQuizImportJson(jsonText, { requireTitle: false });
    if (!parsed.ok) {
      setJsonError(parsed.error);
      return;
    }
    setPreview({ title: parsed.payload.title ?? '', questions: parsed.payload.questions });
  }

  // Default full-screen Kahoot-style studio.
  if (mode === 'studio') {
    return (
      <QuizStudio
        key={studioKey}
        mode="create"
        saving={saving}
        error={jsonError}
        success={success}
        onSave={saveQuiz}
        onCancel={() => navigate(basePath)}
        onValidationError={setJsonError}
        headerExtra={
          <Button type="button" variant="ghost" onClick={() => setMode('json')}>
            <Braces className="size-4" /> JSON import
          </Button>
        }
      />
    );
  }

  return (
    <Page>
      <CreatorNav />
      <MainContent>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1>Create Quiz</h1>
            <Subtitle>Paste AI-generated JSON</Subtitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyTextButton text={QUIZ_IMPORT_EXAMPLE_JSON} tone="example" />
            <CopyTextButton text={QUIZ_IMPORT_AI_PROMPT} tone="prompt" />
            <Button type="button" variant="ghost" onClick={backToStudio}>
              <ArrowLeft className="size-4" /> Back to studio
            </Button>
          </div>
        </div>

        {jsonError && <AppAlert variant="error">{jsonError}</AppAlert>}
        {success && <AppAlert variant="success">{success}</AppAlert>}

        <Card className="w-full max-w-4xl">
          <CardContent className="p-6">
            <h2 className="mb-4">Paste JSON</h2>
            <AppAlert variant="info" className="text-[0.85rem]">
              Use <strong>Copy prompt</strong> for AI instructions + JSON schema, or{' '}
              <strong>Copy example</strong> for a full sample quiz JSON. Attach a document or
              describe a topic (source material is optional), then paste the AI&apos;s JSON here and
              click <strong>Apply to studio</strong>.
            </AppAlert>
            <div className="mb-3 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => navigate(basePath)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleJsonSubmit}
                disabled={saving || !jsonText.trim()}
              >
                {saveLabel}
              </Button>
              <Button type="button" onClick={applyJsonToStudio} disabled={!jsonText.trim()}>
                Apply to studio
              </Button>
            </div>
            <Textarea
              id="quiz-json"
              label="Quiz JSON"
              className="font-mono min-h-80"
              placeholder={QUIZ_IMPORT_JSON_SHORT}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <details className="mt-2 mb-2">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>Example JSON</span>
                <CopyTextButton text={QUIZ_IMPORT_EXAMPLE_JSON} tone="example" inSummary />
              </summary>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-[0.78rem] text-muted-foreground whitespace-pre-wrap">
                {QUIZ_IMPORT_EXAMPLE_JSON}
              </pre>
            </details>
            <details className="mb-4">
              <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>Prompt + schema</span>
                <CopyTextButton text={QUIZ_IMPORT_AI_PROMPT} tone="prompt" inSummary />
              </summary>
              <pre className="mt-3 overflow-x-auto rounded-lg border border-border bg-background p-4 font-mono text-[0.78rem] text-muted-foreground whitespace-pre-wrap">
                {QUIZ_IMPORT_AI_PROMPT}
              </pre>
            </details>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => navigate(basePath)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={openJsonPreview}
                disabled={!jsonText.trim()}
              >
                <Eye className="size-4" /> Preview
              </Button>
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={handleJsonSubmit}
                disabled={saving || !jsonText.trim()}
              >
                {saveLabel}
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={applyJsonToStudio}
                disabled={!jsonText.trim()}
              >
                Apply to studio
              </Button>
            </div>
          </CardContent>
        </Card>
      </MainContent>
      {preview && (
        <QuizPreviewModal
          title={preview.title}
          questions={preview.questions}
          onClose={() => setPreview(null)}
        />
      )}
    </Page>
  );
}
