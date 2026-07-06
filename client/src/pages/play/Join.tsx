import { ArrowRight, Zap } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppAlert } from '@/components/AppAlert';
import {
  AvatarDisplay,
  AvatarPicker,
  loadSavedAvatar,
  saveAvatar,
} from '@/components/AvatarPicker';
import { Input } from '@/components/Input';
import { AppLogo, AuthCard, PageCenter, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import {
  cleanPin,
  clearPlayerSession,
  loadPlayerSession,
  savePlayerSession,
} from '@/helpers/playerSession';
import { getSocket, useSocketEvent } from '@/hooks/useSocket';

import type { AuthUser } from '@/types';

function defaultJoinName(user: AuthUser | null): string {
  if (!user) return '';
  return (user.playDisplayName?.trim() || user.username || '').slice(0, 24);
}

function defaultJoinAvatar(user: AuthUser | null): string {
  if (user?.playAvatar?.trim()) return user.playAvatar.trim();
  return loadSavedAvatar();
}

export default function Join() {
  const { pin: pinParam } = useParams<{ pin?: string }>();
  const navigate = useNavigate();
  const socket = getSocket();
  const { token, user } = useAuth();

  const { appName, appSubtitle } = useApp();
  const [pin, setPin] = useState(pinParam ?? '');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string>(() => loadSavedAvatar());
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [step, setStep] = useState<'form' | 'avatar'>('form');

  useEffect(() => {
    if (!user) return;
    setUsername((prev) => prev || defaultJoinName(user));
    setAvatar((prev) => prev || defaultJoinAvatar(user));
  }, [user]);

  useEffect(() => {
    const stored = loadPlayerSession();

    if (!stored.playerId || !stored.username || !stored.pin || !stored.sessionId) return;

    setJoining(true);

    // socket.io buffers emits until connected — no 'connect' listener needed.
    socket.connect();
    socket.emit('player:join', {
      pin: stored.pin,
      username: stored.username,
      avatar: stored.avatar ?? '',
      playerId: Number(stored.playerId),
      authToken: token ?? undefined,
    });
  }, [socket, token]);

  useSocketEvent<{ playerId: number; sessionId: number; status: string; username?: string }>(
    'player:joined',
    (data) => {
      savePlayerSession({
        playerId: data.playerId,
        sessionId: data.sessionId,
        username: data.username,
        avatar,
        pin: cleanPin(pin),
      });
      if (avatar) saveAvatar(avatar);
      navigate(`/play/game/${data.sessionId}`);
    },
  );

  useSocketEvent<{ message: string }>('player:error', (data) => {
    setError(data.message);
    setJoining(false);
    setStep('form');
    // Only clear session on hard failures — keep storage for retry on reload/reconnect
    if (data.message === 'Invalid PIN' || data.message === 'Game has ended') {
      clearPlayerSession();
    }
  });

  function handleFormNext(e: FormEvent) {
    e.preventDefault();
    setError('');
    const cleanedPin = cleanPin(pin);
    const cleanName = username.trim();
    if (!cleanedPin || cleanedPin.length < 4) {
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
    if (joining) return;
    setError('');
    setJoining(true);

    // socket.io buffers emits until connected — no 'connect' listener needed.
    socket.connect();
    socket.emit('player:join', {
      pin: cleanPin(pin),
      username: username.trim(),
      avatar,
      authToken: token ?? undefined,
    });
  }

  return (
    <PageCenter className="min-h-screen bg-background">
      <AuthCard maxWidth="lg" className="max-w-[420px]">
        <div className="text-center mb-6">
          <AppLogo>
            {appName ? (
              <>
                {appName}{' '}
                <span className="mt-1 flex items-center justify-center gap-1 text-[0.6em] font-normal text-muted-foreground opacity-85">
                  by <Zap className="size-4" /> Quizz
                </span>
              </>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Zap className="size-4" /> Quizz
              </span>
            )}
          </AppLogo>
          {appSubtitle && step === 'form' && (
            <p className="mt-2 text-base font-medium text-foreground">{appSubtitle}</p>
          )}
          <Subtitle className="mt-2">
            {step === 'form'
              ? `Enter a PIN to join${appName ? ` ${appName}` : ''}`
              : 'Choose your avatar'}
          </Subtitle>
        </div>

        {error && <AppAlert variant="error">{error}</AppAlert>}

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
              className="text-center text-[1.6rem] font-bold tracking-[0.12em]"
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
            <Button type="submit" variant="default" size="lg" className="mt-2 w-full">
              <span className="inline-flex items-center gap-1.5">
                Next: Pick Avatar <ArrowRight className="size-4" />
              </span>
            </Button>
          </form>
        ) : (
          <div>
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3.5 py-2.5">
              <AvatarDisplay avatar={avatar} size={40} />
              <div className="flex-1">
                <p className="text-base font-bold">{username}</p>
                <p className="text-[0.78rem] text-muted-foreground">PIN: {pin}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[0.78rem]"
                onClick={() => setStep('form')}
              >
                Edit
              </Button>
            </div>

            <AvatarPicker
              value={avatar}
              onChange={(a) => {
                setAvatar(a);
                saveAvatar(a);
              }}
            />

            <Button
              type="button"
              variant="default"
              size="lg"
              className="mt-5 w-full"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? (
                'Joining…'
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  Join Game <ArrowRight className="size-4" />
                </span>
              )}
            </Button>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {user ? (
            <>
              Signed in as {user.username} · <a href="/u/my-games">My games</a> ·{' '}
              <a href="/">Home</a>
            </>
          ) : (
            <>
              <a href="/login">Sign in</a> · <a href="/register">Register</a> ·{' '}
              <a href="/">Home</a>
            </>
          )}
        </p>
      </AuthCard>
    </PageCenter>
  );
}
