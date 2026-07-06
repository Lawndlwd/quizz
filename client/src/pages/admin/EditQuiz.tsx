import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page, PageCenter } from '@/components/layout';
import { mapDbQuestionToImport, type QuestionWithKey } from '@/helpers';
import CreatorNav from '../../components/CreatorNav';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useCreatorBase } from '../../hooks/useCreatorBase';
import type { ImportPayload, ThemeId } from '../../types';
import { QuizStudio } from './components/studio/QuizStudio';

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
  const [theme, setTheme] = useState<ThemeId>('default');
  const [questions, setQuestions] = useState<QuestionWithKey[]>([]);

  useEffect(() => {
    api
      .get<{
        title: string;
        description: string;
        cover_image?: string | null;
        theme?: ThemeId | null;
        questions: unknown[];
      }>(`/api/admin/quizzes/${id}`)
      .then(({ ok, data }) => {
        if (!ok) {
          setError('Failed to load quiz');
          setLoading(false);
          return;
        }
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setCoverImage(data.cover_image ?? '');
        setTheme(data.theme ?? 'default');
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

  async function handleSave(payload: ImportPayload) {
    setError('');
    setSaving(true);
    const { ok, data } = await api.put<{ error?: string }>(`/api/admin/quizzes/${id}`, payload);
    setSaving(false);
    if (ok) {
      setSuccess('Quiz updated!');
      setTimeout(() => navigate(basePath), 1000);
    } else {
      setError(data.error ?? 'Failed to update quiz');
    }
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
    <QuizStudio
      mode="edit"
      initialTitle={title}
      initialDescription={description}
      initialCoverImage={coverImage}
      initialTheme={theme}
      initialQuestions={questions}
      saving={saving}
      error={error}
      success={success}
      onSave={handleSave}
      onCancel={() => navigate(basePath)}
      onValidationError={setError}
    />
  );
}
