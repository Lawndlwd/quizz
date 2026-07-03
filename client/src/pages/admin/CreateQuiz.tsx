import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import { Input, Textarea } from '@/components/Input';
import { FormRow, MainContent, Page, SectionDivider, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuizPreviewModal } from '@/components/QuizPreviewModal';
import {
  type QuestionWithKey,
  validateClosestToQuestion,
  validateQuizPayload,
  withKey,
} from '@/helpers';
import CreatorNav from '../../components/CreatorNav';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useCreatorBase } from '../../hooks/useCreatorBase';
import type { ImportPayload, ImportQuestion } from '../../types';
import { blankQuestion, QuestionEditor } from './components/QuestionEditor';

const PLACEHOLDER = JSON.stringify(
  {
    title: 'General Knowledge Quiz',
    description: 'A quick 12-question warm-up — geography, code, music & more',
    coverImage: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200',
    questions: [
      {
        text: 'What is the capital of France?',
        options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
        correctIndex: 2,
        baseScore: 500,
        timeSec: 20,
        questionType: 'multiple_choice',
        imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800',
        explanation: 'Paris has been the capital of France since 987 AD.',
        // Per-question labels — the lobby shows the union of all questions' tags.
        tags: ['easy', 'geography'],
      },
      {
        // Code in the question text: ```fenced``` blocks render as a code box
        // (whitespace preserved) and `inline` spans render as inline code.
        // Use \n for newlines inside the JSON string.
        text: 'What does this print?\n```js\nconst a = [1, 2, 3];\nconsole.log(a.map(x => x * 2));\n```',
        options: ['[1, 2, 3]', '[2, 4, 6]', '[1, 4, 9]', 'undefined'],
        correctIndex: 1,
        baseScore: 500,
        timeSec: 30,
        questionType: 'multiple_choice',
        explanation: 'map doubles each element, so `[1,2,3]` becomes `[2,4,6]`.',
        tags: ['code', 'javascript'],
      },
      {
        // Images as answer options: put an image URL as the option value and it
        // renders as a picture instead of text. Options can mix images + text.
        text: 'Which of these animals is a fox?',
        options: [
          'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=600',
          'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600',
          'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600',
          'https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=600',
        ],
        correctIndex: 0,
        baseScore: 500,
        timeSec: 20,
        questionType: 'multiple_choice',
        explanation: 'A: fox 🦊 · B: dog 🐕 · C: cat 🐈 · D: elephant 🐘',
        tags: ['images', 'animals'],
      },
      {
        text: '🎵 Listen — who is the artist? (audio: YouTube plays, video hidden)',
        options: ['Rick Astley', 'Bruno Mars', 'The Weeknd', 'Ed Sheeran'],
        correctIndex: 0,
        baseScore: 500,
        timeSec: 30,
        questionType: 'multiple_choice',
        mediaType: 'audio',
        // Add ?t=SECONDS (or &t=1m30s) to start playback partway in.
        mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=43',
        explanation: "Rick Astley — 'Never Gonna Give You Up' (starts at 0:43).",
        tags: ['music', 'fun'],
      },
      {
        text: '🎬 The first-ever YouTube video — where was it filmed? (video: embedded player)',
        options: ['At the zoo', 'At a concert', 'In a car', 'At home'],
        correctIndex: 0,
        baseScore: 500,
        timeSec: 30,
        questionType: 'multiple_choice',
        mediaType: 'video',
        mediaUrl: 'https://youtu.be/jNQXAC9IVRw',
        explanation: "'Me at the zoo' — San Diego Zoo, 2005.",
        tags: ['trivia', 'fun'],
      },
      {
        text: 'Which of these are prime numbers?',
        options: ['2', '4', '7', '9'],
        correctIndex: 0,
        correctIndices: [0, 2],
        baseScore: 600,
        timeSec: 25,
        questionType: 'multi_select',
        explanation:
          'A prime number has exactly two divisors: 1 and itself. 2 and 7 qualify; 4 and 9 do not.',
        tags: ['math', 'medium'],
      },
      {
        text: 'The Earth is flat.',
        options: ['True', 'False'],
        correctIndex: 1,
        baseScore: 300,
        questionType: 'true_false',
        explanation:
          'Earth is an oblate spheroid — photos from space and centuries of science confirm this.',
        tags: ['science', 'easy'],
      },
      {
        text: 'What is 2 + 2?',
        options: [],
        correctIndex: 0,
        correctAnswer: '4',
        baseScore: 400,
        questionType: 'open_text',
        explanation: 'Basic addition: 2 + 2 = 4.',
        tags: ['math', 'easy'],
      },
      {
        text: 'How many countries are in the African Union?',
        options: [],
        correctIndex: 0,
        correctAnswer: '55',
        rangeMin: 1,
        rangeMax: 100,
        baseScore: 500,
        timeSec: 25,
        questionType: 'closest_to',
        explanation: 'The African Union has 55 member states.',
        tags: ['geography', 'medium'],
      },
      {
        text: 'The ___ is the largest planet, and ___ is closest to the Sun.',
        options: [],
        correctIndex: 0,
        questionType: 'fill_blank',
        // One accepted-answers list per ___ blank (case-insensitive).
        blanks: [['Jupiter'], ['Mercury']],
        baseScore: 500,
        timeSec: 25,
        explanation: 'Partial credit is awarded per blank.',
        tags: ['science', 'space'],
      },
      {
        text: 'Put these events in chronological order (earliest first).',
        // List items in the CORRECT order — players see them shuffled and reorder.
        options: ['Fall of Rome', 'Renaissance', 'Moon landing', 'First iPhone'],
        correctIndex: 0,
        questionType: 'ordering',
        baseScore: 600,
        timeSec: 30,
        explanation: 'Score is proportional to how many items land in the right spot.',
        tags: ['history', 'medium'],
      },
      {
        text: 'Drop a pin on Paris.',
        options: [],
        correctIndex: 0,
        questionType: 'geo',
        // Correct location as real coordinates; players use a live zoomable map.
        geo: { lat: 48.8566, lng: 2.3522 },
        baseScore: 500,
        timeSec: 25,
        explanation: 'Closest pin wins — GeoGuessr-style, scored by real distance.',
        tags: ['geography', 'fun'],
      },
    ],
  } satisfies ImportPayload,
  null,
  2,
);

// Short hint shown inside the empty textarea (full example lives under "Show example").
const PLACEHOLDER_SHORT = `{
  "title": "My Quiz",
  "questions": [
    {
      "text": "What is the capital of France?",
      "options": ["Berlin", "Madrid", "Paris", "Rome"],
      "correctIndex": 2
    }
  ]
}`;

export default function CreateQuiz() {
  const api = useAuthFetch();
  const navigate = useNavigate();
  const basePath = useCreatorBase();
  const [mode, setMode] = useState<'json' | 'manual'>('json');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);
  const [preview, setPreview] = useState<{ title: string; questions: ImportQuestion[] } | null>(
    null,
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [questions, setQuestions] = useState<QuestionWithKey[]>([withKey(blankQuestion())]);

  async function saveQuiz(payload: ImportPayload) {
    setSaving(true);
    setJsonError('');
    setSuccess('');
    const { ok, data } = await api.post<{ id: number; error?: string }>('/api/admin/quizzes', payload);
    setSaving(false);
    if (ok) {
      setSuccess(`Quiz created! ID: ${data.id}`);
      setTimeout(() => navigate(basePath), 1200);
    } else {
      setJsonError(data.error ?? 'Failed to save quiz');
    }
  }

  async function handleJsonSubmit() {
    let payload: ImportPayload;
    try {
      payload = JSON.parse(jsonText);
    } catch {
      setJsonError('Invalid JSON — please check the format');
      return;
    }
    if (!payload.title || !Array.isArray(payload.questions) || payload.questions.length === 0) {
      setJsonError('JSON must have "title" and a non-empty "questions" array');
      return;
    }
    for (let i = 0; i < payload.questions.length; i++) {
      const q = payload.questions[i];
      if ((q.questionType ?? 'multiple_choice') === 'closest_to') {
        const err = validateClosestToQuestion(q, i);
        if (err) {
          setJsonError(err);
          return;
        }
      }
    }
    await saveQuiz(payload);
  }

  async function handleManualSubmit() {
    const err = validateQuizPayload(title, questions);
    if (err) {
      setJsonError(err);
      return;
    }
    await saveQuiz({ title, description, coverImage: coverImage || undefined, questions });
  }

  function updateQuestion(i: number, field: keyof ImportQuestion, value: unknown) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));
  }

  function openPreview() {
    setJsonError('');
    if (mode === 'json') {
      let payload: ImportPayload;
      try {
        payload = JSON.parse(jsonText);
      } catch {
        setJsonError('Invalid JSON — fix it before previewing');
        return;
      }
      if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
        setJsonError('Add at least one question to preview');
        return;
      }
      setPreview({ title: payload.title ?? title, questions: payload.questions });
    } else {
      if (questions.length === 0) {
        setJsonError('Add at least one question to preview');
        return;
      }
      setPreview({ title, questions });
    }
  }

  return (
    <Page>
      <CreatorNav />
      <MainContent>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Create Quiz</h1>
            <Subtitle>Build manually or paste AI-generated JSON</Subtitle>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'json' ? 'default' : 'ghost'}
              onClick={() => setMode('json')}
            >
              JSON Import
            </Button>
            <Button
              type="button"
              variant={mode === 'manual' ? 'default' : 'ghost'}
              onClick={() => setMode('manual')}
            >
              Manual Builder
            </Button>
          </div>
        </div>

        {jsonError && <AppAlert variant="error">{jsonError}</AppAlert>}
        {success && <AppAlert variant="success">{success}</AppAlert>}

        {mode === 'json' ? (
          <Card className="w-full max-w-4xl">
            <CardContent className="p-6">
              <h2 className="mb-4">Paste JSON</h2>
              <AppAlert variant="info" className="text-[0.85rem]">
                Use an AI (ChatGPT, Claude, etc.) to generate the JSON below. Supports{' '}
                <strong>multiple_choice</strong>, <strong>multi_select</strong> (use{' '}
                <code>correctIndices</code> array), <strong>true_false</strong>, and{' '}
                <strong>open_text</strong>, and <strong>closest_to</strong> (use{' '}
                <code>rangeMin</code>/<code>rangeMax</code> + numeric <code>correctAnswer</code>)
                question types. Any question type can include optional <code>imageUrl</code>,{' '}
                <code>explanation</code> (shown on results after the timer), or a YouTube{' '}
                <code>mediaUrl</code> with <code>mediaType</code> set to <strong>"audio"</strong>{' '}
                (sound only, video hidden) or <strong>"video"</strong> (embedded player). Question{' '}
                <code>text</code> supports <code>```code```</code> blocks and <code>`inline`</code>{' '}
                code, and any <code>options</code> value can be an image URL to show a picture
                instead of text.
              </AppAlert>
              <div className="mb-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => navigate(basePath)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleJsonSubmit}
                  disabled={saving || !jsonText.trim()}
                >
                  {saving ? 'Saving…' : '✓ Create Quiz'}
                </Button>
              </div>
              <Textarea
                id="quiz-json"
                label="Quiz JSON"
                className="font-mono min-h-80"
                placeholder={PLACEHOLDER_SHORT}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              <details className="mt-2 mb-4">
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>Show example / schema</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigator.clipboard.writeText(PLACEHOLDER);
                      setCopiedExample(true);
                      setTimeout(() => setCopiedExample(false), 1500);
                    }}
                  >
                    {copiedExample ? '✓ Copied' : '📋 Copy'}
                  </Button>
                </summary>
                <div className="relative mt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={() => {
                      navigator.clipboard.writeText(PLACEHOLDER);
                      setCopiedExample(true);
                      setTimeout(() => setCopiedExample(false), 1500);
                    }}
                  >
                    {copiedExample ? '✓ Copied' : '📋 Copy'}
                  </Button>
                  <pre className="overflow-x-auto rounded-lg border border-border bg-background p-4 pt-12 font-mono text-[0.78rem] text-muted-foreground">
                    {PLACEHOLDER}
                  </pre>
                </div>
              </details>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => navigate(basePath)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="secondary"
                  onClick={openPreview}
                  disabled={!jsonText.trim()}
                >
                  👁 Preview
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleJsonSubmit}
                  disabled={saving || !jsonText.trim()}
                >
                  {saving ? 'Saving…' : '✓ Create Quiz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full max-w-4xl">
            <CardContent className="p-6">
              <h2 className="mb-4">Quiz Details</h2>
              <FormRow className="mb-4">
                <Input
                  noMargin
                  label="Title *"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My Awesome Quiz"
                />
                <Input
                  noMargin
                  label="Subtitle / description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Shown to players in the lobby"
                />
              </FormRow>
              <Input
                label="Cover image URL (optional)"
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/cover.jpg — shown on the players' waiting screen"
              />
              {coverImage.trim() && (
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="mb-4 max-h-[160px] w-full rounded-lg object-cover"
                />
              )}
              <SectionDivider />
              <h2 className="mb-4">Questions</h2>

              {questions.map((q, qi) => (
                <QuestionEditor
                  key={q._key}
                  q={q}
                  qi={qi}
                  onChange={(field, value) => updateQuestion(qi, field, value)}
                  onRemove={() => setQuestions((prev) => prev.filter((_, idx) => idx !== qi))}
                  canRemove={questions.length > 1}
                />
              ))}

              <Button
                type="button"
                variant="ghost"
                className="mb-4 w-full"
                onClick={() => setQuestions((prev) => [...prev, withKey(blankQuestion())])}
              >
                + Add Question
              </Button>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => navigate(basePath)}>
                  Cancel
                </Button>
                <Button type="button" size="lg" variant="secondary" onClick={openPreview}>
                  👁 Preview
                </Button>
                <Button type="button" size="lg" onClick={handleManualSubmit} disabled={saving}>
                  {saving ? 'Saving…' : '✓ Create Quiz'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
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
