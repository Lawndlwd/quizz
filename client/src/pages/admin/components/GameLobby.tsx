import { AvatarDisplay } from '../../../components/AvatarPicker';

interface PlayerInfo { id: number; username: string; totalScore: number; avatar?: string; }

interface Props {
  quizTitle?: string;
  questionCount: number;
  pin: string;
  shareUrl: string;
  players: PlayerInfo[];
  onStart: () => void;
  onDiscard: () => void;
  onCopyLink: () => void;
}

export function GameLobby({ quizTitle, questionCount, pin, shareUrl, players, onStart, onDiscard, onCopyLink }: Props) {
  return (
    <div className="main-content">
      <div className="gc-header mb-6">
        <div>
          <h1>{quizTitle}</h1>
          <p className="subtitle">Waiting for players — {questionCount} question{questionCount !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onDiscard} className="btn btn-ghost btn-sm">Discard</button>
      </div>

      <div className="gc-grid gap-6">
        <div className="card">
          <h2 className="mb-2">Game PIN</h2>
          <div className="pin-display">{pin}</div>
          <div className="mt-4">
            <p className="text-sm text-muted mb-2">Share this link:</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} style={{ flex: 1 }} onClick={e => (e.target as HTMLInputElement).select()} />
              <button onClick={onCopyLink} className="btn btn-secondary">Copy</button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="gc-start-row mb-4">
            <h2>Players ({players.length})</h2>
            <button
              onClick={onStart}
              disabled={players.length === 0}
              className="btn btn-success btn-lg"
            >
              ▶ Start Game
            </button>
          </div>
          <div className="players-grid">
            {players.length === 0 ? (
              <p className="text-muted text-sm">Waiting for players to join<span className="dots"> <span>.</span><span>.</span><span>.</span></span></p>
            ) : (
              players.map(p => (
                <div key={p.id} className="player-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <AvatarDisplay avatar={p.avatar} size={22} />
                  {p.username}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
