import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { ImportPayload, ImportQuestion, QuestionType } from '../../types';
import { Input, Textarea } from '../../components/Input';

function blankQuestion(): ImportQuestion {
  return { text: '', options: ['', '', '', ''], correctIndex: 0, baseScore: 500, timeSec: 20, questionType: 'multiple_choice' };
}

function QuestionEditor({ q, qi, onChange, onRemove, canRemove }: {
  q: ImportQuestion;
  qi: number;
  onChange: (field: keyof ImportQuestion, value: unknown) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const type = q.questionType ?? 'multiple_choice';

  function setType(t: QuestionType) {
    onChange('questionType', t);
    if (t === 'true_false') {
      onChange('options', ['True', 'False']);
      onChange('correctIndex', 0);
    } else if (t === 'open_text') {
      onChange('options', []);
    } else {
      if ((q.options ?? []).length < 2) onChange('options', ['', '', '', '']);
    }
  }

  function updateOption(oi: number, value: string) {
    const opts = [...(q.options ?? [])];
    opts[oi] = value;
    onChange('options', opts);
  }

  function addOption() {
    onChange('options', [...(q.options ?? []), '']);
  }

  function removeOption(oi: number) {
    const opts = (q.options ?? []).filter((_, i) => i !== oi);
    const newCorrect = q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex;
    onChange('options', opts);
    onChange('correctIndex', Math.min(newCorrect, opts.length - 1));
  }

  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '20px 24px',
      marginBottom: 16,
    }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>{qi + 1}</span>
          <h3 style={{ color: 'var(--text2)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Question {qi + 1}</h3>
        </div>
        {canRemove && (
          <button onClick={onRemove} className="btn-icon" title="Remove question">🗑</button>
        )}
      </div>

      {/* Question Type */}
      <div className="form-group">
        <label>Question Type</label>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {(['multiple_choice', 'true_false', 'open_text'] as QuestionType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`btn btn-sm ${type === t ? 'btn-primary' : 'btn-ghost'}`}
            >
              {t === 'multiple_choice' ? 'Multiple Choice' : t === 'true_false' ? 'True / False' : 'Open Text'}
            </button>
          ))}
        </div>
      </div>

      <Textarea label="Question Text *"
        rows={2}
        style={{ resize: 'vertical', minHeight: 'unset', width: '100%' }}
        value={q.text}
        onChange={e => onChange('text', e.target.value)}
        placeholder="What is…?"
      />

      {/* Image URL */}
      <Input label="Image URL (optional)"
        type="url"
        value={q.imageUrl ?? ''}
        onChange={e => onChange('imageUrl', e.target.value || undefined)}
        placeholder="https://example.com/image.jpg"
      />
      {q.imageUrl && (
        <img src={q.imageUrl} alt="Preview" style={{ maxHeight: 120, borderRadius: 8, marginBottom: 12, objectFit: 'contain', maxWidth: '100%' }} />
      )}

      {/* Options */}
      {type === 'multiple_choice' && (
        <div className="mb-3">
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>Answer Options</label>
          {(q.options ?? []).map((opt, oi) => (
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
              <Input
                style={{ flex: 1, marginBottom: 0 }}
                value={opt}
                onChange={e => updateOption(oi, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
              />
              {(q.options ?? []).length > 2 && (
                <button onClick={() => removeOption(oi)} className="btn-icon" style={{ flexShrink: 0 }} title="Remove option">✕</button>
              )}
            </div>
          ))}
          <button onClick={addOption} className="btn btn-ghost btn-sm mt-1" style={{ fontSize: '0.8rem' }}>+ Add Option</button>
        </div>
      )}

      {type === 'true_false' && (
        <div className="mb-3">
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text2)', marginBottom: 8, fontWeight: 500 }}>Correct Answer</label>
          <div className="flex gap-3">
            {['True', 'False'].map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange('correctIndex', i)}
                className={`btn btn-lg ${q.correctIndex === i ? (i === 0 ? 'btn-success' : 'btn-danger') : 'btn-ghost'}`}
                style={{ flex: 1 }}
              >
                {i === 0 ? '✓' : '✗'} {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {type === 'open_text' && (
        <Input label="Correct Answer *"
          value={q.correctAnswer ?? ''}
          onChange={e => onChange('correctAnswer', e.target.value)}
          placeholder="e.g. Paris (case-insensitive)"
        />
      )}

      <div className="form-row">
        {type === 'multiple_choice' && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Correct Answer</label>
            <select value={q.correctIndex} onChange={e => onChange('correctIndex', Number(e.target.value))}>
              {(q.options ?? []).map((opt, oi) => (
                <option key={oi} value={oi}>{String.fromCharCode(65 + oi)}{opt ? ` — ${opt}` : ''}</option>
              ))}
            </select>
          </div>
        )}
        <Input noMargin label="Base Score"
          type="number" min={0} step={50} value={q.baseScore}
          onChange={e => onChange('baseScore', Number(e.target.value))} />
        <Input noMargin label="Time (seconds)"
          type="number" min={5} max={120} value={q.timeSec ?? 20}
          onChange={e => onChange('timeSec', Number(e.target.value))} />
      </div>
    </div>
  );
}

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
