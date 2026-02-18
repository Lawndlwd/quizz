import { useState, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';

export default function Join() {
  const { pin: pinParam } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  const [pin, setPin] = useState(pinParam ?? '');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  useSocketEvent<{ playerId: number; sessionId: number; status: string }>('player:joined', data => {
    sessionStorage.setItem('playerId', String(data.playerId));
    sessionStorage.setItem('username', username.trim());
    navigate(`/play/game/${data.sessionId}`);
  });

  useSocketEvent<{ message: string }>('player:error', data => {
    setError(data.message);
    setJoining(false);
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const cleanPin = pin.trim().replace(/\s/g, '');
    const cleanName = username.trim();
    if (!cleanPin || cleanPin.length < 4) { setError('Enter a valid PIN'); return; }
    if (!cleanName) { setError('Enter a username'); return; }
    setJoining(true);
    socket.connect();
    socket.emit('player:join', { pin: cleanPin, username: cleanName });
  }

  return (
    <div className="page-center" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="card">
        <div className="text-center mb-6">
          <div className="logo">⚡ Quizz</div>
          <p className="subtitle mt-2">Enter a PIN to join a game</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pin">Game PIN</label>
            <input
              id="pin"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="123456"
              value={pin}
              onChange={e => setPin(e.target.value)}
              style={{ fontSize: '1.6rem', fontWeight: 700, letterSpacing: '0.12em', textAlign: 'center' }}
              autoFocus={!pinParam}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Your Name</label>
            <input
              id="username"
              type="text"
              maxLength={24}
              placeholder="e.g. Alice"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus={!!pinParam}
              required
            />
          </div>
          <button type="submit" disabled={joining} className="btn btn-primary btn-full btn-lg mt-2">
            {joining ? 'Joining…' : 'Join Game →'}
          </button>
        </form>
      </div>
    </div>
  );
}
