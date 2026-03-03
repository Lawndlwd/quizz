import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AvatarDisplay,
  AvatarPicker,
  loadSavedAvatar,
  saveAvatar,
} from '../../components/AvatarPicker';
import { Input } from '../../components/Input';
import { useApp } from '../../context/AppContext';
import { getSocket, useSocketEvent } from '../../hooks/useSocket';

export default function Join() {
  const { pin: pinParam } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const socket = getSocket();

  const { appName, appSubtitle } = useApp();
  const [pin, setPin] = useState(pinParam ?? '');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string>(loadSavedAvatar);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [step, setStep] = useState<'form' | 'avatar'>('form');

  // Auto-rejoin: if we have a previous session in sessionStorage, reconnect automatically
  useEffect(() => {
    const storedPlayerId = sessionStorage.getItem('playerId');
    const storedUsername = sessionStorage.getItem('username');
    const storedPin = sessionStorage.getItem('pin');
    const storedAvatar = sessionStorage.getItem('avatar');
    const storedSessionId = sessionStorage.getItem('sessionId');

    if (!storedPlayerId || !storedUsername || !storedPin || !storedSessionId) return;

    setJoining(true);

    function doRejoin() {
      socket.emit('player:join', {
        pin: storedPin,
        username: storedUsername,
        avatar: storedAvatar ?? '',
      });
    }

    if (socket.connected) {
      doRejoin();
    } else {
      socket.connect();
      socket.once('connect', doRejoin);
    }

    return () => {
      socket.off('connect', doRejoin);
    };
  }, [socket]);

  useSocketEvent<{ playerId: number; sessionId: number; status: string; username?: string }>(
    'player:joined',
    (data) => {
      sessionStorage.setItem('playerId', String(data.playerId));
      sessionStorage.setItem('sessionId', String(data.sessionId));
      // Only overwrite sessionStorage with form values when user actually filled the form
      // (not during auto-rejoin where local state is still at defaults)
      if (username.trim()) {
        sessionStorage.setItem('username', data.username ?? username.trim());
        sessionStorage.setItem('avatar', avatar);
        sessionStorage.setItem('pin', pin.trim().replace(/\s/g, ''));
        saveAvatar(avatar);
      }
      navigate(`/play/game/${data.sessionId}`);
    },
  );

  useSocketEvent<{ message: string }>('player:error', (data) => {
    setError(data.message);
    setJoining(false);
    setStep('form');
    // Clear stale session data so auto-rejoin doesn't loop
    sessionStorage.removeItem('playerId');
    sessionStorage.removeItem('sessionId');
    sessionStorage.removeItem('pin');
  });

  function handleFormNext(e: FormEvent) {
    e.preventDefault();
    setError('');
    const cleanPin = pin.trim().replace(/\s/g, '');
    const cleanName = username.trim();
    if (!cleanPin || cleanPin.length < 4) {
      setError('Enter a valid PIN');
      return;
    }
    if (!cleanName) {
      setError('Enter your name');
      return;
    }
    setStep('avatar');
  }

  function handleJoin() {
    setError('');
    setJoining(true);

    const payload = {
      pin: pin.trim().replace(/\s/g, ''),
      username: username.trim(),
      avatar,
    };

    if (socket.connected) {
      socket.emit('player:join', payload);
    } else {
      socket.connect();
      socket.once('connect', () => socket.emit('player:join', payload));
    }
  }

  return (
    <div className="page-center" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%' }}>
        <div className="text-center mb-6">
          <div className="logo">
            {appName ? (
              <>
                {appName}{' '}
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: '0.6em',
                    display: 'block',
                    marginTop: 4,
                    WebkitTextFillColor: 'var(--text2)',
                    opacity: 0.85,
                  }}
                >
                  by ⚡ Quizz
                </span>
              </>
            ) : (
              '⚡ Quizz'
            )}
          </div>
          {appSubtitle && step === 'form' && (
            <p className="mt-2" style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 500 }}>
              {appSubtitle}
            </p>
          )}
          <p className="subtitle mt-2">
            {step === 'form'
              ? `Enter a PIN to join${appName ? ` ${appName}` : ''}`
              : 'Choose your avatar'}
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 'form' ? (
          <form onSubmit={handleFormNext}>
            <Input
              id="pin"
              label="Game PIN"
              type="text"
              inputMode="numeric"
              maxLength={8}
              placeholder="123456"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{
                fontSize: '1.6rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textAlign: 'center',
              }}
              autoFocus={!pinParam}
              required
            />
            <Input
              id="username"
              label="Your Name"
              type="text"
              maxLength={24}
              placeholder="e.g. Alice"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus={!!pinParam}
              required
            />
            <button type="submit" className="btn btn-primary btn-full btn-lg mt-2">
              Next: Pick Avatar →
            </button>
          </form>
        ) : (
          <div>
            {/* Name recap */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 24,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
              }}
            >
              <AvatarDisplay avatar={avatar} size={40} />
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: '1rem' }}>{username}</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>PIN: {pin}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                Edit
              </button>
            </div>

            <AvatarPicker
              value={avatar}
              onChange={(a) => {
                setAvatar(a);
                saveAvatar(a);
              }}
            />

            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop: 20 }}
            >
              {joining ? 'Joining…' : 'Join Game →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
