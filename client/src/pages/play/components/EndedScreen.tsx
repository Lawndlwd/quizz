import { AvatarDisplay } from '../../../components/AvatarPicker';
import type { GameEndedPayload } from '../../../types';

interface Props {
  leaderboard: GameEndedPayload['leaderboard'];
  username: string;
  onPlayAgain: () => void;
}

const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

function getRankMessage(rank: number, total: number): { icon: string; title: string } {
  if (rank === 1) return { icon: '🏆', title: 'Champion!' };
  if (rank === 2) return { icon: '🥈', title: 'Almost there!' };
  if (rank === 3) return { icon: '🥉', title: 'On the podium!' };
  if (rank <= Math.ceil(total / 2)) return { icon: '💪', title: 'Well played!' };
  return { icon: '🎮', title: 'Nice try!' };
}

export function EndedScreen({ leaderboard, username, onPlayAgain }: Props) {
  const myRank = leaderboard.find((e) => e.username === username);
  const { icon, title } = myRank
    ? getRankMessage(myRank.rank, leaderboard.length)
    : { icon: '🏁', title: 'Game Over!' };

  return (
    <div className="page-center">
      <div className="card card-md">
        <div className="text-center mb-6">
          <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>{icon}</div>
          <h1>{title}</h1>
          {myRank && (
            <p className="subtitle mt-2">
              You finished <strong style={{ color: 'var(--accent2)' }}>#{myRank.rank}</strong> with{' '}
              <strong style={{ color: 'var(--accent2)' }}>
                {myRank.totalScore.toLocaleString()} pts
              </strong>
            </p>
          )}
        </div>
        <h2 className="mb-4 text-center">🏆 Final Scores</h2>
        <ul className="leaderboard">
          {leaderboard.map((e) => (
            <li
              key={e.rank}
              className={`lb-item rank-${Math.min(e.rank, 4)}`}
              style={
                e.username === username
                  ? { borderColor: 'var(--accent2)', background: 'rgba(168,85,247,.08)' }
                  : {}
              }
            >
              <div className="lb-rank">{MEDALS[e.rank] ?? e.rank}</div>
              <AvatarDisplay avatar={e.avatar} size={30} />
              <div className="lb-name">
                {e.username}
                {e.username === username ? ' 👈' : ''}
              </div>
              <div className="lb-score">{e.totalScore.toLocaleString()}</div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onPlayAgain}
          className="btn btn-primary btn-full mt-6 btn-lg"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
