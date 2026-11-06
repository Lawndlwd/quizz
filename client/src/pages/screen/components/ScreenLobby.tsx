import { QRCodeSVG } from 'qrcode.react';
import { LobbyPlayers } from '@/components/game/LobbyPlayers';
import { QuizIntroCard } from '@/components/game/QuizIntroCard';
import { useApp } from '@/context/AppContext';
import { publicBaseUrl } from '@/helpers';
import type { PlayerInfo, QuizIntro } from '@/types';

interface Props {
  pin: string;
  title: string;
  questionCount: number;
  intro?: QuizIntro;
  players: PlayerInfo[];
}

export function ScreenLobby({ pin, title, questionCount, intro, players }: Props) {
  const { publicUrl } = useApp();
  const baseUrl = publicBaseUrl(publicUrl);
  const joinUrl = `${baseUrl}/play/${pin}`;

  return (
    <div className="mx-auto grid w-full max-w-[1800px] flex-1 items-center gap-8 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:p-10">
      <div className="flex min-w-0 flex-col items-center gap-3 text-center">
        <div className="text-2xl font-bold">Scan to join</div>
        <div className="w-full max-w-[min(46vh,420px)] rounded-3xl bg-white p-5">
          <QRCodeSVG
            value={joinUrl}
            title={`Join link: ${joinUrl}`}
            level="M"
            size={380}
            style={{ width: '100%', height: 'auto' }}
          />
        </div>
        <div className="text-xl text-muted-foreground">
          or go to{' '}
          <strong className="text-foreground">{baseUrl.replace(/^https?:\/\//, '')}</strong> and
          enter
        </div>
        <div className="pin-display">{pin}</div>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        {intro ? (
          <QuizIntroCard intro={intro} layout="row" className="screen-intro" />
        ) : (
          <div className="text-center">
            <h1 className="font-extrabold" style={{ fontSize: 'clamp(2rem, 4vw, 4.5rem)' }}>
              {title}
            </h1>
            <p className="mt-1 text-xl text-muted-foreground">
              {questionCount} question{questionCount === 1 ? '' : 's'}
            </p>
          </div>
        )}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-2xl font-semibold">
            {players.length} player{players.length === 1 ? '' : 's'} joined
          </div>
          <LobbyPlayers players={players} />
        </div>
      </div>
    </div>
  );
}
