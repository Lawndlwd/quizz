import { AvatarDisplay } from '../../../components/AvatarPicker';
import type { QuestionResults } from '../../../types';

interface Props {
  results: QuestionResults;
  questionIndex: number;
  autoAdvanceLeft: number;
  onNextQuestion: () => void;
  onEndGame: () => void;
}

export function GameResults({
  results,
  questionIndex,
  autoAdvanceLeft,
  onNextQuestion,
  onEndGame,
}: Props) {
  return (
    <div className="main-content">
      <div className="gc-header mb-4">
        <h2>Results — Q{questionIndex + 1}</h2>
        <div className="flex gap-2 gc-results-actions">
          <button type="button" onClick={onEndGame} className="btn btn-ghost btn-sm">
            End Game
          </button>
          <button
            type="button"
            onClick={onNextQuestion}
            className="btn btn-primary btn-lg"
            style={{ position: 'relative', minWidth: 180 }}
          >
            {results.isLastQuestion ? '🏁 Final Scores' : `Next →`}
            {results.autoAdvanceSec > 0 && (
              <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: 6 }}>
                ({autoAdvanceLeft}s)
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="card card-lg mb-4">
        <p className="text-muted text-sm mb-2">Question</p>
        <h2 style={{ marginBottom: 16 }}>{results.questionText}</h2>
        {results.questionType === 'open_text' ? (
          <div
            style={{
              background: 'rgba(34,197,94,.1)',
              border: '1px solid rgba(34,197,94,.3)',
              borderRadius: 8,
              padding: '12px 16px',
            }}
          >
            <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: 4 }}>
              Correct answer
            </p>
            <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--success)' }}>
              {results.correctAnswer}
            </p>
          </div>
        ) : (
          <div className="options-grid">
            {results.options.map((opt, i) => (
              <div
                key={String.fromCharCode(65 + i)}
                className={`option-btn ${i === results.correctIndex ? 'correct' : ''}`}
                style={{ cursor: 'default' }}
              >
                <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                <div className="option-text">{opt}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card card-lg">
        <h2 className="mb-4">Leaderboard</h2>
        <ul className="leaderboard">
          {results.leaderboard.slice(0, 10).map((e) => (
            <li key={e.playerId} className={`lb-item rank-${Math.min(e.rank, 4)}`}>
              <div className="lb-rank">{e.rank}</div>
              <AvatarDisplay avatar={e.avatar} size={30} />
              <div className="lb-name">{e.username}</div>
              {e.questionScore > 0 && <span className="lb-delta">+{e.questionScore}</span>}
              {e.chosenIndex !== null && e.chosenIndex !== -1 && !e.isCorrect && (
                <span className="lb-delta wrong">✗</span>
              )}
              <div className="lb-score">{e.totalScore.toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
