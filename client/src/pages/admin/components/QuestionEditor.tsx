import { ImportQuestion, QuestionType } from '../../../types';
import { Input, Textarea } from '../../../components/Input';

export function blankQuestion(): ImportQuestion {
  return { text: '', options: ['', '', '', ''], correctIndex: 0, baseScore: 500, timeSec: 20, questionType: 'multiple_choice' };
}

interface Props {
  q: ImportQuestion;
  qi: number;
  onChange: (field: keyof ImportQuestion, value: unknown) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function QuestionEditor({ q, qi, onChange, onRemove, canRemove }: Props) {
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
