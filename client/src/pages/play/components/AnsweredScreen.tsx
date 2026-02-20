interface Props {
  isCorrect: boolean;
  score: number;
  wasPassJoker?: boolean;
}

export function AnsweredScreen({ isCorrect, score, wasPassJoker }: Props) {
  return (
    <div className="page-center">
      <div className="card text-center">
        <div className="answer-overlay">
          {wasPassJoker ? (
            <>
              <span className="answer-icon">⏭</span>
              <div className="answer-label">Question Skipped</div>
              <div className="answer-pts">+<strong>{score}</strong> pts</div>
            </>
          ) : (
            <>
              <span className="answer-icon">{isCorrect ? '✅' : '❌'}</span>
              <div className="answer-label">{isCorrect ? 'Correct!' : 'Wrong answer'}</div>
              {isCorrect && (
                <div className="answer-pts">+<strong>{score}</strong> pts</div>
              )}
            </>
          )}
          <p className="text-muted mt-4 text-sm">Waiting for other players<span className="dots"><span>.</span><span>.</span><span>.</span></span></p>
        </div>
      </div>
    </div>
  );
}
