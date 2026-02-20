import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { ImportPayload, ImportQuestion, QuestionType } from '../../types';
import { Input } from '../../components/Input';
import { QuestionEditor, blankQuestion } from './components/QuestionEditor';

export default function EditQuiz() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<ImportQuestion[]>([]);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`/api/admin/quizzes/${id}`, { headers })
      .then(r => r.json())
      .then(data => {
        setTitle(data.title ?? '');
        setDescription(data.description ?? '');
        setQuestions(
          (data.questions ?? []).map((q: {
            text: string; options: string[]; correct_index: number;
            base_score: number; time_sec: number; image_url?: string;
            question_type?: QuestionType; correct_answer?: string;
          }) => ({
            text: q.text,
            options: q.options,
            correctIndex: q.correct_index,
            baseScore: q.base_score,
            timeSec: q.time_sec,
            imageUrl: q.image_url ?? undefined,
            questionType: q.question_type ?? 'multiple_choice',
            correctAnswer: q.correct_answer ?? undefined,
          }))
        );
        setLoading(false);
      })
      .catch(() => { setError('Failed to load quiz'); setLoading(false); });
  }, [id]);

  async function handleSubmit() {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) { setError(`Question ${i + 1} has no text`); return; }
      const type = q.questionType ?? 'multiple_choice';
      if (type === 'open_text' && !q.correctAnswer?.trim()) { setError(`Question ${i + 1} needs a correct answer`); return; }
      if (type === 'multiple_choice' && q.options.some(o => !o.trim())) { setError(`Question ${i + 1} has empty options`); return; }
    }

    setSaving(true);
    const payload: ImportPayload = { title, description, questions };
    const res = await fetch(`/api/admin/quizzes/${id}`, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSuccess('Quiz updated!');
      setTimeout(() => navigate('/admin'), 1200);
    } else {
      setError(data.error ?? 'Failed to update quiz');
    }
  }

  function updateQuestion(i: number, field: keyof ImportQuestion, value: unknown) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }

  if (loading) return (
    <div className="page"><AdminNav /><div className="page-center"><p className="text-muted">Loading quiz…</p></div></div>
  );

  return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Edit Quiz</h1>
            <p className="subtitle">Update questions, options, scores and timings</p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card card-lg">
          <h2 className="mb-4">Quiz Details</h2>
          <div className="form-row mb-4">
            <Input noMargin label="Title *"
              value={title} onChange={e => setTitle(e.target.value)} placeholder="My Awesome Quiz" />
            <Input noMargin label="Description"
              value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
          </div>

          <div className="divider" />
          <h2 className="mb-4">Questions</h2>

          {questions.map((q, qi) => (
            <QuestionEditor
              key={qi}
              q={q}
              qi={qi}
              onChange={(field, value) => updateQuestion(qi, field, value)}
              onRemove={() => setQuestions(prev => prev.filter((_, idx) => idx !== qi))}
              canRemove={questions.length > 1}
            />
          ))}

          <button onClick={() => setQuestions(prev => [...prev, blankQuestion()])} className="btn btn-ghost btn-full mb-4">+ Add Question</button>

          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <button onClick={() => navigate('/admin')} className="btn btn-ghost">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn btn-primary btn-lg">
              {saving ? 'Saving…' : '✓ Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
