import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminNav from '../../components/AdminNav';
import { useAuth } from '../../context/AuthContext';
import { ImportPayload, ImportQuestion, QuestionType } from '../../types';
import { Input, Textarea } from '../../components/Input';

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
