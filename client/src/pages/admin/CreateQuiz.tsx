import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { ImportPayload, ImportQuestion } from '../../types';

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
      },
      {
        text: 'Which planet is closest to the Sun?',
        options: ['Venus', 'Mercury', 'Earth', 'Mars'],
        correctIndex: 1,
        baseScore: 500,
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

  // Manual mode
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<ImportQuestion[]>([
    { text: '', options: ['', '', '', ''], correctIndex: 0, baseScore: 500, timeSec: 20 },
  ]);

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
      if (q.options.some(o => !o.trim())) { setJsonError(`Question ${i + 1} has empty options`); return; }
    }
    await saveQuiz({ title, description, questions });
  }

  function addQuestion() {
    setQuestions(prev => [...prev, { text: '', options: ['', '', '', ''], correctIndex: 0, baseScore: 500, timeSec: 20 }]);
  }

  function removeQuestion(i: number) {
    setQuestions(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i: number, field: keyof ImportQuestion, value: unknown) {
    setQuestions(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: value } : q));
  }

  function updateOption(qi: number, oi: number, value: string) {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = [...q.options];
      opts[oi] = value;
      return { ...q, options: opts };
    }));
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
              Use an AI (ChatGPT, Claude, etc.) to generate the JSON below. Ask it to follow this exact schema, then paste the result here.
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
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Awesome Quiz" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
              </div>
            </div>

            <div className="divider" />
            <h2 className="mb-4">Questions</h2>

            {questions.map((q, qi) => (
              <div key={qi} className="bg-surface2 border rounded p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3>Question {qi + 1}</h3>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(qi)} className="btn-icon">🗑</button>
                  )}
                </div>
                <div className="form-group">
                  <label>Question Text *</label>
                  <input value={q.text} onChange={e => updateQuestion(qi, 'text', e.target.value)} placeholder="What is…?" />
                </div>
                <div className="grid-2 mb-3">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="form-group" style={{ marginBottom: 0 }}>
                      <label>
                        Option {String.fromCharCode(65 + oi)}
                        {q.correctIndex === oi && <span style={{ color: 'var(--success)', marginLeft: 6 }}>✓ correct</span>}
                      </label>
                      <input value={opt} onChange={e => updateOption(qi, oi, e.target.value)} placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                    </div>
                  ))}
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Correct Answer</label>
                    <select value={q.correctIndex} onChange={e => updateQuestion(qi, 'correctIndex', Number(e.target.value))}>
                      {q.options.map((opt, oi) => (
                        <option key={oi} value={oi}>{String.fromCharCode(65 + oi)}{opt ? ` — ${opt}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Base Score</label>
                    <input type="number" min={0} step={50} value={q.baseScore} onChange={e => updateQuestion(qi, 'baseScore', Number(e.target.value))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Time (seconds)</label>
                    <input type="number" min={5} max={120} value={q.timeSec} onChange={e => updateQuestion(qi, 'timeSec', Number(e.target.value))} />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addQuestion} className="btn btn-ghost btn-full mb-4">+ Add Question</button>

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
