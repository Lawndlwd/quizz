import { AvatarDisplay } from '../../../components/AvatarPicker';

interface LeaderboardEntry { rank: number; username: string; totalScore: number; avatar?: string; }

interface Props {
  quizTitle?: string;
  leaderboard: LeaderboardEntry[];
  sessionId: string;
  onViewDetails: () => void;
  onDashboard: () => void;
}

export function GameEnded({ quizTitle, leaderboard, onViewDetails, onDashboard }: Props) {
  return (
    <div className="main-content">
      <div className="text-center mb-6">
        <div style={{ fontSize: '4rem', marginBottom: 12 }}>🏁</div>
        <h1>Game Over!</h1>
        <p className="subtitle mt-2">{quizTitle}</p>
      </div>

      <div className="card card-md" style={{ margin: '0 auto' }}>
        <h2 className="mb-4 text-center">🏆 Final Leaderboard</h2>
        <ul className="leaderboard">
          {leaderboard.map(e => (
            <li key={e.rank} className={`lb-item rank-${Math.min(e.rank, 4)}`}>
              <div className="lb-rank">{e.rank}</div>
              <AvatarDisplay avatar={e.avatar} size={30} />
              <div className="lb-name">{e.username}</div>
              <div className="lb-score">{e.totalScore.toLocaleString()}</div>
            </li>
          ))}
        </ul>
        <div className="flex gap-2 mt-6">
          <button onClick={onViewDetails} className="btn btn-secondary btn-full">View Details</button>
          <button onClick={onDashboard} className="btn btn-primary btn-full">← Dashboard</button>
        </div>
      </div>
    </div>
  );
}
