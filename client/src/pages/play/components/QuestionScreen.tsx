import { QuestionPayload } from '../../../types';

interface Props {
  question: QuestionPayload;
  timeLeft: number;
  selectedIndex: number | null;
  openTextInput: string;
  openTextSubmitted: boolean;
  eliminatedIndices: number[];
  jokersEnabled: { pass: boolean; fiftyFifty: boolean };
  jokersUsed: { pass: boolean; fiftyFifty: boolean };
  onAnswer: (index: number) => void;
  onOpenTextChange: (value: string) => void;
  onOpenTextSubmit: () => void;
  onPassJoker: () => void;
  onFiftyFiftyJoker: () => void;
}

export function QuestionScreen({
  question,
  timeLeft,
  selectedIndex,
  openTextInput,
  openTextSubmitted,
  eliminatedIndices,
  jokersEnabled,
  jokersUsed,
  onAnswer,
  onOpenTextChange,
  onOpenTextSubmit,
  onPassJoker,
  onFiftyFiftyJoker,
}: Props) {
  const pct = (timeLeft / question.timeSec) * 100;
  const urgent = timeLeft <= 5;
  const isTrueFalse = question.questionType === 'true_false';
  const isOpenText = question.questionType === 'open_text';

  return (
    <div className="page-vcenter">
      <div style={{ maxWidth: 700, margin: '0 auto', width: '100%' }}>
        <div className="question-header">
          <div className="question-counter">Question {question.questionIndex + 1} of {question.totalQuestions}</div>
          {question.imageUrl && (
            <img
              src={question.imageUrl}
              alt="Question"
              style={{ width: '100%', maxHeight: 340, borderRadius: 12, margin: '12px 0 0', display: 'block', objectFit: 'cover' }}
            />
          )}
          <div className="question-text" style={{ marginTop: question.imageUrl ? 12 : 0 }}>{question.text}</div>
          <div className="timer-wrap">
            <div className="progress-bar"><div className={`progress-fill ${urgent ? 'urgent' : ''}`} style={{ width: `${pct}%` }} /></div>
            <div className={`timer-value ${urgent ? 'urgent' : ''}`}>{timeLeft}</div>
          </div>
        </div>

        {/* Joker buttons */}
        {(jokersEnabled.pass || jokersEnabled.fiftyFifty) && selectedIndex === null && !openTextSubmitted && (
          <div style={{ display: 'flex', gap: 10, padding: '0 20px 4px', justifyContent: 'flex-end' }}>
            {jokersEnabled.pass && (
              <button
                className="btn btn-warning btn-sm"
                disabled={jokersUsed.pass}
                title={jokersUsed.pass ? 'Pass already used' : 'Skip this question and receive the base score'}
                onClick={onPassJoker}
              >
                {jokersUsed.pass ? '✓ Pass' : '⏭ Pass'}
              </button>
            )}
            {jokersEnabled.fiftyFifty && !isTrueFalse && !isOpenText && (
              <button
                className="btn btn-warning btn-sm"
                disabled={jokersUsed.fiftyFifty}
                title={jokersUsed.fiftyFifty ? '50/50 already used' : 'Eliminate 2 wrong answers'}
                onClick={onFiftyFiftyJoker}
              >
                {jokersUsed.fiftyFifty ? '✓ 50/50' : '50/50'}
              </button>
            )}
          </div>
        )}

        {isTrueFalse ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '20px' }}>
            {['True', 'False'].map((label, i) => (
              <button
                key={i}
                disabled={selectedIndex !== null}
                onClick={() => onAnswer(i)}
                className={`option-btn ${selectedIndex === i ? 'selected' : ''}`}
                style={{ justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, minHeight: 90,
                  background: i === 0 ? (selectedIndex === 0 ? undefined : 'rgba(34,197,94,.08)') : (selectedIndex === 1 ? undefined : 'rgba(239,68,68,.08)'),
                  borderColor: i === 0 ? 'var(--success)' : 'var(--danger)',
                }}
              >
                <span style={{ fontSize: '1.8rem' }}>{i === 0 ? '✓' : '✗'}</span>
                {label}
              </button>
            ))}
          </div>
        ) : isOpenText ? (
          <div style={{ padding: '20px' }}>
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px' }}>
              <label style={{ display: 'block', color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 10, fontWeight: 500 }}>Your answer</label>
              <input
                type="text"
                value={openTextInput}
                onChange={e => onOpenTextChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !openTextSubmitted && onOpenTextSubmit()}
                disabled={openTextSubmitted}
                placeholder="Type your answer…"
                style={{ width: '100%', marginBottom: 12, fontSize: '1.1rem' }}
                autoFocus
              />
              <button
                onClick={onOpenTextSubmit}
                disabled={openTextSubmitted || !openTextInput.trim()}
                className="btn btn-primary btn-full btn-lg"
              >
                {openTextSubmitted ? 'Submitted!' : 'Submit Answer →'}
              </button>
            </div>
          </div>
        ) : (
          <div className="options-grid">
            {question.options.map((opt, i) => {
              const isEliminated = eliminatedIndices.includes(i);
              return (
                <button
                  key={i}
                  disabled={selectedIndex !== null || isEliminated}
                  onClick={() => onAnswer(i)}
                  className={`option-btn ${selectedIndex === i ? 'selected' : ''} ${isEliminated ? 'eliminated' : ''}`}
                >
                  <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                  <div className="option-text">{isEliminated ? '—' : opt}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
