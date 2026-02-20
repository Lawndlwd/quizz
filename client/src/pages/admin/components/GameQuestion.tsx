import type { QuestionPayload } from '../../../types';

interface Props {
  question: QuestionPayload;
  timeLeft: number;
  answeredCount: number;
  totalPlayers: number;
  onEndGame: () => void;
}

export function GameQuestion({
  question,
  timeLeft,
  answeredCount,
  totalPlayers,
  onEndGame,
}: Props) {
  const pct = (timeLeft / question.timeSec) * 100;
  const urgent = timeLeft <= 5;
  const answerPct = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

  return (
    <div className="main-content">
      <div className="gc-header mb-4">
        <h2>
          Question {question.questionIndex + 1} / {question.totalQuestions}
        </h2>
        <button type="button" onClick={onEndGame} className="btn btn-ghost btn-sm">
          End Game
        </button>
      </div>

      <div className="card card-lg mb-4 min-w-full">
        <div className="gc-question-top mb-4">
          <div style={{ flex: 1 }}>
            <p className="text-muted text-sm mb-2">Question {question.questionIndex + 1}</p>
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="Question"
                style={{
                  maxWidth: '100%',
                  maxHeight: 180,
                  borderRadius: 8,
                  marginBottom: 10,
                  objectFit: 'contain',
                }}
              />
            )}
            <h2 style={{ fontSize: '1.3rem' }}>{question.text}</h2>
          </div>
          <div
            className={`timer-value ${urgent ? 'urgent' : ''}`}
            style={{ marginLeft: 24, minWidth: 60, flexShrink: 0 }}
          >
            {timeLeft}
          </div>
        </div>
        <div className="progress-bar">
          <div className={`progress-fill ${urgent ? 'urgent' : ''}`} style={{ width: `${pct}%` }} />
        </div>

        {question.questionType !== 'open_text' && (
          <div className="options-grid mt-4">
            {question.options.map((opt, i) => (
              <div key={opt} className="option-btn" style={{ cursor: 'default' }}>
                <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                <div className="option-text">{opt}</div>
              </div>
            ))}
          </div>
        )}
        {question.questionType === 'open_text' && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'var(--surface2)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <p className="text-muted text-sm">Open-text question — players type their answer</p>
          </div>
        )}
      </div>

      <div className="gc-grid gap-4">
        <div className="stat-card">
          <div className="stat-value">
            {answeredCount} / {totalPlayers}
          </div>
          <div className="stat-label">Answered</div>
          <div className="answer-bar mt-2">
            <div className="answer-bar-fill" style={{ width: `${answerPct}%` }} />
          </div>
        </div>
        <div
          className="stat-card"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <p className="text-muted text-sm text-center">
            Results show automatically
            <br />
            when timer ends or everyone answers
          </p>
        </div>
      </div>
    </div>
  );
}
