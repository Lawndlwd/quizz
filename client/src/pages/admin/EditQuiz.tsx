import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { ImportPayload, ImportQuestion } from '../../types';

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
            base_score: number; time_sec: number;
          }) => ({
            text: q.text,
            options: q.options,
            correctIndex: q.correct_index,
            baseScore: q.base_score,
            timeSec: q.time_sec,
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
      if (q.options.some(o => !o.trim())) { setError(`Question ${i + 1} has empty options`); return; }
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

  function addOption(qi: number) {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      return { ...q, options: [...q.options, ''] };
    }));
  }

  function removeOption(qi: number, oi: number) {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qi) return q;
      const opts = q.options.filter((_, i) => i !== oi);
      const newCorrect = q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex;
      return { ...q, options: opts, correctIndex: Math.min(newCorrect, opts.length - 1) };
    }));
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

              <div className="mb-3">
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>
                  Answer Options
                </label>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2 mb-2">
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: q.correctIndex === oi ? 'var(--success)' : 'var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '0.75rem', flexShrink: 0,
                      color: q.correctIndex === oi ? '#fff' : 'var(--text2)',
                    }}>
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      style={{ flex: 1, marginBottom: 0 }}
                      value={opt}
                      onChange={e => updateOption(qi, oi, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                    />
                    {q.options.length > 2 && (
                      <button
                        onClick={() => removeOption(qi, oi)}
                        className="btn-icon"
                        style={{ flexShrink: 0 }}
                        title="Remove option"
                      >✕</button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addOption(qi)}
                  className="btn btn-ghost btn-sm mt-1"
                  style={{ fontSize: '0.8rem' }}
                >
                  + Add Option
                </button>
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
                  <input type="number" min={5} max={120} value={q.timeSec ?? 20} onChange={e => updateQuestion(qi, 'timeSec', Number(e.target.value))} />
                </div>
              </div>
            </div>
          ))}

          <button onClick={addQuestion} className="btn btn-ghost btn-full mb-4">+ Add Question</button>

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
