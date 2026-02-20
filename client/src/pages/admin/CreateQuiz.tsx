import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { ImportPayload, ImportQuestion } from '../../types';
import { Input } from '../../components/Input';
import { QuestionEditor, blankQuestion } from './components/QuestionEditor';

const PLACEHOLDER = JSON.stringify(
  {
    title: 'My Quiz',
    description: 'Optional description',
    questions: [
      {
        text: 'What is the capital of France?',
        options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
        correctIndex: 2,
        baseScore: 500,
        timeSec: 20,
        questionType: 'multiple_choice',
        imageUrl: 'https://example.com/image.jpg',
      },
      {
        text: 'The Earth is flat.',
        options: ['True', 'False'],
        correctIndex: 1,
        baseScore: 300,
        questionType: 'true_false',
      },
      {
        text: 'What is 2 + 2?',
        options: [],
        correctIndex: 0,
        correctAnswer: '4',
        baseScore: 400,
        questionType: 'open_text',
      },
    ],
  } satisfies ImportPayload,
  null,
  2
);

export default function CreateQuiz() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'json' | 'manual'>('json');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<ImportQuestion[]>([blankQuestion()]);

  const headers = { Authorization: `Bearer ${token}` };

  async function saveQuiz(payload: ImportPayload) {
    setSaving(true);
    setJsonError('');
    setSuccess('');
    const res = await fetch('/api/admin/quizzes', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSuccess(`Quiz created! ID: ${data.id}`);
      setTimeout(() => navigate('/admin'), 1200);
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
    await saveQuiz(payload);
  }

  async function handleManualSubmit() {
    if (!title.trim()) { setJsonError('Title is required'); return; }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) { setJsonError(`Question ${i + 1} has no text`); return; }
      const type = q.questionType ?? 'multiple_choice';
      if (type === 'open_text' && !q.correctAnswer?.trim()) { setJsonError(`Question ${i + 1} needs a correct answer`); return; }
      if (type === 'multiple_choice' && q.options.some(o => !o.trim())) { setJsonError(`Question ${i + 1} has empty options`); return; }
    }
    await saveQuiz({ title, description, questions });
  }

  function updateQuestion(i: number, field: keyof ImportQuestion, value: unknown) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }

  return (
    <div className="page">
      <AdminNav />
      <div className="main-content">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1>Create Quiz</h1>
            <p className="subtitle">Build manually or paste AI-generated JSON</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setMode('json')} className={`btn ${mode === 'json' ? 'btn-primary' : 'btn-ghost'}`}>JSON Import</button>
            <button onClick={() => setMode('manual')} className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}>Manual Builder</button>
          </div>
        </div>

        {jsonError && <div className="alert alert-error">{jsonError}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {mode === 'json' ? (
          <div className="card card-lg">
            <h2 className="mb-4">Paste JSON</h2>
            <div className="alert alert-info mb-4" style={{ fontSize: '0.85rem' }}>
              Use an AI (ChatGPT, Claude, etc.) to generate the JSON below. Supports <strong>multiple_choice</strong>, <strong>true_false</strong>, and <strong>open_text</strong> question types.
            </div>
            <div className="form-group">
              <label>Quiz JSON</label>
              <textarea
                className="mono"
                style={{ minHeight: 320 }}
                placeholder={PLACEHOLDER}
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
              />
            </div>
            <details className="mt-2 mb-4">
              <summary className="text-sm text-muted" style={{ cursor: 'pointer' }}>Show example / schema</summary>
              <pre className="font-mono mt-2" style={{ background: 'var(--bg)', padding: 16, borderRadius: 8, fontSize: '0.78rem', overflowX: 'auto', border: '1px solid var(--border)', color: 'var(--text2)' }}>{PLACEHOLDER}</pre>
            </details>
            <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => navigate('/admin')} className="btn btn-ghost">Cancel</button>
              <button onClick={handleJsonSubmit} disabled={saving || !jsonText.trim()} className="btn btn-primary btn-lg">
                {saving ? 'Saving…' : '✓ Create Quiz'}
              </button>
            </div>
          </div>
        ) : (
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
              <button onClick={handleManualSubmit} disabled={saving} className="btn btn-primary btn-lg">
                {saving ? 'Saving…' : '✓ Create Quiz'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
