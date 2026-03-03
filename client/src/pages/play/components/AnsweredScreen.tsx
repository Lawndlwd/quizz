interface Props {
  isCorrect: boolean;
  score: number;
  wasPassJoker?: boolean;
  answeredCount: number;
  totalPlayers: number;
}

export function AnsweredScreen({ wasPassJoker, answeredCount, totalPlayers }: Props) {
  const answerPct = totalPlayers > 0 ? (answeredCount / totalPlayers) * 100 : 0;

  return (
    <div className="page-center">
      <div className="card text-center">
        <div className="answer-overlay">
          {wasPassJoker ? (
            <>
              <span className="answer-icon">⏭</span>
              <div className="answer-label">Question Skipped</div>
            </>
          ) : (
            <>
              <span className="answer-icon">🔒</span>
              <div className="answer-label">Answer locked in!</div>
            </>
          )}

          {/* Answer counter */}
          {totalPlayers > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="answer-counter" style={{ fontSize: '1.1rem', marginBottom: 8 }}>
                {answeredCount} / {totalPlayers} answered
              </div>
              <div className="answer-bar" style={{ maxWidth: 220, margin: '0 auto' }}>
                <div className="answer-bar-fill" style={{ width: `${answerPct}%` }} />
              </div>
            </div>
          )}

          <p className="text-muted mt-4 text-sm">
            Waiting for other players
            <span className="dots">
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
