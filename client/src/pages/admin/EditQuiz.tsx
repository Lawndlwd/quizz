import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import {
  FormRow,
  MainContent,
  Page,
  PageCenter,
  SectionDivider,
  Subtitle,
} from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { QuizPreviewModal } from '@/components/QuizPreviewModal';
import { mapDbQuestionToImport, type QuestionWithKey, validateQuizPayload, withKey } from '@/helpers';
import CreatorNav from '../../components/CreatorNav';
import { Input } from '../../components/Input';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useCreatorBase } from '../../hooks/useCreatorBase';
import type { ImportPayload, ImportQuestion } from '../../types';
import { blankQuestion, QuestionEditor } from './components/QuestionEditor';

export default function EditQuiz() {
  const api = useAuthFetch();
  const navigate = useNavigate();
  const basePath = useCreatorBase();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [questions, setQuestions] = useState<QuestionWithKey[]>([]);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    api
      .get<{ title: string; description: string; cover_image?: string | null; questions: unknown[] }>(
        `/api/admin/quizzes/${id}`,
      )
      .then(({ ok, data }) => {
        if (!ok) {
          setError('Failed to load quiz');
          setLoading(false);
          return;
        }
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setCoverImage(data.cover_image ?? '');
        setQuestions(
          (data.questions ?? []).map((q) =>
            mapDbQuestionToImport(q as Parameters<typeof mapDbQuestionToImport>[0]),
          ),
        );
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load quiz');
        setLoading(false);
      });
  }, [id, api]);

  async function handleSubmit() {
    setError('');
    const validationError = validateQuizPayload(title, questions);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    const payload: ImportPayload = {
      title,
      description,
      coverImage: coverImage || undefined,
      questions,
    };
    const { ok, data } = await api.put<{ error?: string }>(`/api/admin/quizzes/${id}`, payload);
    setSaving(false);
    if (ok) {
      setSuccess('Quiz updated!');
      setTimeout(() => navigate(basePath), 1200);
    } else {
      setError(data.error ?? 'Failed to update quiz');
    }
  }

  function updateQuestion(i: number, field: keyof ImportQuestion, value: unknown) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, [field]: value } : q)));
  }

  if (loading)
    return (
      <Page>
        <CreatorNav />
        <PageCenter>
          <p className="text-muted-foreground">Loading quiz…</p>
        </PageCenter>
      </Page>
    );

  return (
    <Page>
      <CreatorNav />
      <MainContent>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Edit Quiz</h1>
            <Subtitle>Update questions, options, scores and timings</Subtitle>
          </div>
        </div>

        {error && <AppAlert variant="error">{error}</AppAlert>}
        {success && <AppAlert variant="success">{success}</AppAlert>}

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
              <Button
                type="button"
                size="lg"
                variant="secondary"
                onClick={() => setPreviewing(true)}
                disabled={questions.length === 0}
              >
                👁 Preview
              </Button>
              <Button type="button" size="lg" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Saving…' : '✓ Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </MainContent>
      {previewing && (
        <QuizPreviewModal
          title={title}
          questions={questions}
          onClose={() => setPreviewing(false)}
        />
      )}
    </Page>
  );
}
