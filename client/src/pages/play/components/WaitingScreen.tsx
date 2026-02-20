import { AvatarDisplay } from '../../../components/AvatarPicker';

interface Props {
  username: string;
  avatar: string;
}

export function WaitingScreen({ username, avatar }: Props) {
  return (
    <div className="page-center">
      <div className="card text-center">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <AvatarDisplay avatar={avatar} size={80} style={{ border: '3px solid var(--accent)' }} />
        </div>
        <h2>Get Ready!</h2>
        <p className="subtitle mt-2 mb-6">
          Waiting for the game to start
          <span className="dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
        <div
          className="player-chip"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '1rem',
            padding: '8px 20px',
          }}
        >
          <AvatarDisplay avatar={avatar} size={24} />
          {username}
        </div>
      </div>
    </div>
  );
}
