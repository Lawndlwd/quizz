import { AvatarDisplay } from '../../../components/AvatarPicker';
import type { QuestionResults, QuestionType } from '../../../types';

interface Props {
  results: QuestionResults;
  playerId: number;
  autoAdvanceLeft: number;
}

export function ResultsScreen({ results, playerId, autoAdvanceLeft }: Props) {
  const myEntry = results.leaderboard.find((e) => e.playerId === playerId);
  const isOpenText = (results.questionType as QuestionType) === 'open_text';

  return (
    <div
      className="page"
      style={{ maxWidth: 600, margin: '0 auto', width: '100%', padding: '24px 16px' }}
    >
      {/* Correct answer reveal */}
      <div className="card mb-4" style={{ maxWidth: '100%', minWidth: 0 }}>
        <p className="text-muted text-sm mb-2">{results.questionText}</p>
        {isOpenText ? (
          <div
            className="result-reveal-correct"
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
          <div className="options-grid" style={{ padding: 0, gap: 8 }}>
            {results.options.map((opt, i) => {
              const isCorrect = i === results.correctIndex;
              const myChoice = myEntry?.chosenIndex === i;
              return (
                <div
                  key={String.fromCharCode(65 + i)}
                  className={`option-btn result-reveal ${isCorrect ? 'correct' : myChoice ? 'wrong' : ''}`}
                  style={{ cursor: 'default', animationDelay: `${i * 0.06}s` }}
                >
                  <div className="option-letter">{String.fromCharCode(65 + i)}</div>
                  <div className="option-text">{opt}</div>
                  {isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My result — with score pop animation */}
      {myEntry && (
        <div
          className={`alert ${myEntry.isCorrect ? 'alert-success result-flash-correct' : 'alert-error result-flash-wrong'} text-center mb-4`}
          style={{
            fontSize: '1.05rem',
            fontWeight: 600,
            padding: '16px 20px',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          {myEntry.isCorrect ? (
            <>
              ✓ Correct! <span className="score-pop">+{myEntry.questionScore}</span> pts · Total:{' '}
              {myEntry.totalScore.toLocaleString()}
            </>
          ) : (
            <>✗ Wrong — {myEntry.totalScore.toLocaleString()} pts total</>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="card" style={{ maxWidth: '100%', minWidth: 0 }}>
        <h2 className="mb-4 text-center">🏆 Standings</h2>
        <ul className="leaderboard">
          {results.leaderboard.slice(0, 8).map((e, idx) => (
            <li
              key={e.playerId}
              className={`lb-item rank-${Math.min(e.rank, 4)} lb-slide`}
              style={{
                animationDelay: `${idx * 0.05}s`,
                ...(e.playerId === playerId
                  ? { borderColor: 'var(--accent2)', background: 'rgba(168,85,247,.08)' }
                  : {}),
              }}
            >
              <div className="lb-rank">{e.rank}</div>
              <AvatarDisplay avatar={e.avatar} size={30} />
              <div className="lb-name">
                {e.username}
                {e.playerId === playerId ? ' 👈' : ''}
              </div>
              {e.questionScore > 0 && <span className="lb-delta">+{e.questionScore}</span>}
              <div className="lb-score">{e.totalScore.toLocaleString()}</div>
            </li>
          ))}
        </ul>
        {results.autoAdvanceSec > 0 ? (
          <p className="text-center text-muted text-sm mt-4">
            Next question in <strong style={{ color: 'var(--accent2)' }}>{autoAdvanceLeft}s</strong>
            …
          </p>
        ) : (
          <p className="text-center text-muted text-sm mt-4">Waiting for admin to continue…</p>
        )}
      </div>
    </div>
  );
}
