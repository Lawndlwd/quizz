interface PlayerAnswer {
  questionId: number;
  questionText: string;
  score: number;
  isCorrect: boolean;
}

interface Props {
  playerName: string;
  answers: PlayerAnswer[];
  onRemovePoints: (questionId: number) => void;
  onClose: () => void;
}

export function RemovePointsModal({ playerName, answers, onClose, onRemovePoints }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.7)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card card-md"
        style={{ maxWidth: 520, width: '100%', zIndex: 201, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 className="mb-1">Remove Points — {playerName}</h2>
        <p className="text-muted text-sm mb-4">
          Select a question to remove its points from this player.
        </p>

        {answers.length === 0 && <p className="text-muted">No answers found.</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {answers.map((a) => (
            <div
              key={a.questionId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                background: 'var(--surface2)',
                borderRadius: 8,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>
                  {a.questionText}
                </p>
                <p className="text-muted text-sm">
                  {a.isCorrect ? 'Correct' : 'Wrong'} — {a.score} pts
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={a.score === 0}
                onClick={() => onRemovePoints(a.questionId)}
                style={{
                  color: a.score > 0 ? 'var(--danger)' : undefined,
                  opacity: a.score === 0 ? 0.4 : 1,
                  flexShrink: 0,
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
