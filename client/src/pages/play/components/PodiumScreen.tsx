import { GameEndedPayload } from '../../../types';
import { AvatarDisplay } from '../../../components/AvatarPicker';

interface Props {
  leaderboard: GameEndedPayload['leaderboard'];
  onContinue: () => void;
}

export function PodiumScreen({ leaderboard, onContinue }: Props) {
  const top3 = leaderboard.slice(0, 3);
  const podiumOrder = [
    { entry: top3[1], medal: '🥈', place: 2, color: '#9ca3af', barH: 120 },
    { entry: top3[0], medal: '🥇', place: 1, color: '#fbbf24', barH: 160 },
    { entry: top3[2], medal: '🥉', place: 3, color: '#cd7c3a', barH: 90 },
  ];

  return (
    <div className="page-center" style={{ flexDirection: 'column', gap: 32 }}>
      <h1 style={{ textAlign: 'center', fontSize: '2rem' }}>🏁 Game Over!</h1>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 420 }}>
        {podiumOrder.map(({ entry, medal, place, color, barH }, idx) => {
          if (!entry) return <div key={idx} style={{ flex: 1 }} />;
          const isFirst = place === 1;
          return (
            <div
              key={entry.rank}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                animation: `podiumRise 0.5s ease ${idx * 0.12}s both`,
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 8, padding: '0 4px' }}>
                <div style={{ fontSize: isFirst ? '2rem' : '1.6rem', marginBottom: 6 }}>{medal}</div>
                <AvatarDisplay
                  avatar={entry.avatar}
                  size={isFirst ? 56 : 44}
                  style={{ border: `3px solid ${color}`, marginBottom: 6 }}
                />
                <div style={{
                  fontWeight: 700,
                  fontSize: isFirst ? '0.9rem' : '0.78rem',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                  color: 'var(--text)',
                  marginBottom: 4,
                }}>
                  {entry.username}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color }}>
                  {entry.totalScore.toLocaleString()} pts
                </div>
              </div>
              <div style={{
                width: '100%',
                height: barH,
                background: `linear-gradient(180deg, ${color}, ${color}bb)`,
                borderRadius: '8px 8px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isFirst ? '2rem' : '1.6rem',
                fontWeight: 900,
                color: place === 1 ? '#000' : '#fff',
              }}>
                {place}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onContinue} className="btn btn-primary btn-lg">
        See Full Results →
      </button>
    </div>
  );
}
